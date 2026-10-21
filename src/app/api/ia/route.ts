import { createClient } from "@supabase/supabase-js";
import {
  CATEGORIAS,
  type Adiantada,
  type Assinatura,
  type Categoria,
  type Parcelamento,
  type RendaFixa,
  type Repasse,
  type Terceiro,
  type Transacao,
} from "@/lib/finance";
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

type Tentativa = { modelo: string; status: number; motivo: string };
// 0 = erro de rede ou tempo esgotado
const SOBRECARGA = [0, 500, 502, 503, 504];

async function chamarGemini(modelo: string, chave: string, corpo: string): Promise<{ texto?: string; status: number; motivo: string }> {
  try {
    const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
      body: corpo,
      signal: AbortSignal.timeout(20_000),
    });
    const bruto = await resposta.text();
    let json: { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } } = {};
    try {
      json = JSON.parse(bruto);
    } catch {}
    if (!resposta.ok) {
      // A mensagem vem do Google e não contém a chave; ajuda a achar chave ou modelo errados.
      return { status: resposta.status, motivo: String(json.error?.message ?? "").slice(0, 160) };
    }
    const texto = (json.candidates?.[0]?.content?.parts ?? []).map((x) => x.text ?? "").join("").trim();
    return texto ? { texto, status: 200, motivo: "" } : { status: 502, motivo: "resposta vazia" };
  } catch {
    return { status: 0, motivo: "tempo esgotado ou falha de rede" };
  }
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

  const [a, t, r, p, d, tc, rp, sg] = await Promise.all([
    sb.from("autorizados").select("email,nome"),
    sb.from("transacoes").select("*"),
    sb.from("rendas_fixas").select("*"),
    sb.from("parcelamentos").select("*"),
    sb.from("parcelas_adiantadas").select("*"),
    sb.from("terceiros").select("*"),
    sb.from("repasses").select("*"),
    sb.from("assinaturas").select("*"),
  ]);
  const falha = a.error ?? t.error ?? r.error ?? p.error ?? d.error ?? tc.error ?? rp.error ?? sg.error;
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
    adiantadas: (d.data ?? []).map((x) => ({
      ...norm(x),
      valor_pago: Number(x.valor_pago),
      pago_por: x.pago_por ? String(x.pago_por).toLowerCase() : null,
    })) as Adiantada[],
    terceiros: (tc.data ?? []).map((x) => norm(x)) as Terceiro[],
    repasses: (rp.data ?? []).map((x) => ({ ...norm(x), valor: Number(x.valor) })) as Repasse[],
    assinaturas: (sg.data ?? []).map((x) => ({ ...norm(x), valor_mensal: Number(x.valor_mensal) })) as Assinatura[],
  });

  const corpo = JSON.stringify({
    systemInstruction: { parts: [{ text: INSTRUCAO_SISTEMA }] },
    contents: [{ role: "user", parts: [{ text: montarPedido(contexto, lido.pedido, lido.visao) }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
  });

  // Tenta o modelo principal e, se o Google estiver sobrecarregado ou o modelo indisponível, os reservas.
  const primario = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
  const reservas = (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.6-flash,gemini-3.5-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const modelos = [...new Set([primario, ...reservas])];
  const limite = Date.now() + 50_000;
  let ultima: Tentativa = { modelo: primario, status: 0, motivo: "" };

  for (const modelo of modelos) {
    for (let tentativa = 0; tentativa < 2 && Date.now() < limite; tentativa++) {
      const r = await chamarGemini(modelo, chaveGemini, corpo);
      if (r.texto) return Response.json({ texto: r.texto });
      ultima = { modelo, status: r.status, motivo: r.motivo };
      console.error("Gemini", modelo, r.status, r.motivo);
      if (SOBRECARGA.includes(r.status)) {
        await new Promise((ok) => setTimeout(ok, 1200));
        continue; // tenta de novo o mesmo modelo
      }
      break; // outro erro: passa para o próximo modelo
    }
    if (ultima.status === 401 || ultima.status === 403) break; // chave sem permissão: reservas não ajudam
    if (Date.now() >= limite) break;
  }

  if (ultima.status === 429) return erro("O limite gratuito da IA foi atingido. Tente em alguns minutos.", 429);
  if (SOBRECARGA.includes(ultima.status)) {
    return erro("A IA do Google está sobrecarregada neste momento. Tente de novo em alguns instantes.", 503);
  }
  return erro(`A IA não respondeu (HTTP ${ultima.status}${ultima.motivo ? `: ${ultima.motivo}` : ""}). Modelo: ${ultima.modelo}.`, 502);
}
