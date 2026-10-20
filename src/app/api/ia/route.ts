import { createClient } from "@supabase/supabase-js";
import { CATEGORIAS, type Categoria, type Parcelamento, type RendaFixa, type Transacao } from "@/lib/finance";
import { INSTRUCAO_SISTEMA, montarContexto, montarPedido, type PedidoIA, type VisaoIA } from "@/lib/ia";

const LIMITE_POR_HORA = 30;
const usos = new Map<string, { n: number; reinicia: number }>();

function dentroDoLimite(email: string): boolean {
  const agora = Date.now();
  const u = usos.get(email);
  if (!u || u.reinicia < agora) {
    usos.set(email, { n: 1, reinicia: agora + 3_600_000 });
    return true;
  }
  u.n += 1;
  return u.n <= LIMITE_POR_HORA;
}

const erro = (mensagem: string, status: number) => Response.json({ erro: mensagem }, { status });

function lerPedido(corpo: unknown): { pedido: PedidoIA; visao: VisaoIA; mes: string } | string {
  if (typeof corpo !== "object" || corpo === null) return "Pedido inválido.";
  const c = corpo as Record<string, unknown>;
  const visao: VisaoIA = c.visao === "casal" ? "casal" : "pessoal";
  if (typeof c.mes !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(c.mes)) return "Mês inválido.";
  if (c.modo === "analise") return { pedido: { modo: "analise" }, visao, mes: c.mes };
  if (c.modo === "pergunta") {
    const pergunta = typeof c.pergunta === "string" ? c.pergunta.trim() : "";
    if (pergunta.length < 3 || pergunta.length > 400) return "A pergunta deve ter entre 3 e 400 caracteres.";
    return { pedido: { modo: "pergunta", pergunta }, visao, mes: c.mes };
  }
  if (c.modo === "compra") {
    const nome = typeof c.nome === "string" ? c.nome.trim().slice(0, 80) : "";
    const valor = Number(c.valor);
    const parcelas = Math.floor(Number(c.parcelas));
    const categoria = c.categoria as Categoria;
    if (!nome || !(valor > 0) || !(parcelas >= 1 && parcelas <= 120) || !CATEGORIAS.includes(categoria)) {
      return "Dados da compra inválidos.";
    }
    return { pedido: { modo: "compra", nome, valor, parcelas, categoria }, visao, mes: c.mes };
  }
  return "Modo inválido.";
}

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return erro("Entre novamente para usar a IA.", 401);

  const chaveGemini = process.env.GEMINI_API_KEY;
  const urlSb = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveSb = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!chaveGemini || !urlSb || !chaveSb) {
    return erro("A IA ainda não foi configurada neste servidor (falta GEMINI_API_KEY).", 503);
  }

  const lido = lerPedido(await req.json().catch(() => null));
  if (typeof lido === "string") return erro(lido, 400);

  // O token do usuário faz o banco aplicar as regras de acesso (RLS) a cada consulta.
  const sb = createClient(urlSb, chaveSb, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: usuario, error: erroAuth } = await sb.auth.getUser(token);
  const email = usuario.user?.email?.toLowerCase();
  if (erroAuth || !email) return erro("Sessão inválida. Entre novamente.", 401);
  if (!dentroDoLimite(email)) return erro("Muitas perguntas seguidas. Tente de novo daqui a pouco.", 429);

  const [a, t, r, p] = await Promise.all([
    sb.from("autorizados").select("email,nome"),
    sb.from("transacoes").select("*"),
    sb.from("rendas_fixas").select("*"),
    sb.from("parcelamentos").select("*"),
  ]);
  const falha = a.error ?? t.error ?? r.error ?? p.error;
  if (falha) return erro("Não foi possível ler os dados.", 500);
  const pessoas = (a.data ?? []).map((x) => ({ email: String(x.email).toLowerCase(), nome: String(x.nome ?? "") }));
  if (!pessoas.some((x) => x.email === email)) return erro("Acesso não autorizado.", 403);

  const norm = <T extends { autor_email: string }>(x: T) => ({ ...x, autor_email: x.autor_email.toLowerCase() });
  const contexto = montarContexto({
    visao: lido.visao,
    mes: lido.mes,
    email,
    pessoas,
    transacoes: (t.data ?? []).map((x) => ({ ...norm(x), valor: Number(x.valor) })) as Transacao[],
    rendas: (r.data ?? []).map((x) => ({ ...norm(x), valor: Number(x.valor) })) as RendaFixa[],
    parcelamentos: (p.data ?? []).map((x) => ({ ...norm(x), valor_total: Number(x.valor_total) })) as Parcelamento[],
  });

  const modelo = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  let resposta: Response;
  try {
    resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": chaveGemini },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCAO_SISTEMA }] },
        contents: [{ role: "user", parts: [{ text: montarPedido(contexto, lido.pedido, lido.visao) }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return erro("A IA demorou demais para responder. Tente novamente.", 504);
  }

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    console.error("Gemini", resposta.status, detalhe.slice(0, 300));
    if (resposta.status === 429) return erro("O limite gratuito da IA foi atingido. Tente em alguns minutos.", 429);
    // A mensagem vem do Google e não contém a chave; ajuda a achar chave ou modelo errados.
    let motivo = "";
    try {
      motivo = String(JSON.parse(detalhe)?.error?.message ?? "").slice(0, 160);
    } catch {}
    return erro(`A IA não respondeu (HTTP ${resposta.status}${motivo ? `: ${motivo}` : ""}). Modelo: ${modelo}.`, 502);
  }
  const json = await resposta.json();
  const texto: string = (json.candidates?.[0]?.content?.parts ?? [])
    .map((x: { text?: string }) => x.text ?? "")
    .join("")
    .trim();
  if (!texto) return erro("A IA não gerou resposta para este pedido.", 502);
  return Response.json({ texto });
}
