import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { chamarTelegram, enviarMensagem, esc, tokenVinculo } from "@/lib/telegram";

type Atualizacao = { update_id: number; message?: { text?: string; chat: { id: number; type: string } } };

const resposta = (corpo: Record<string, unknown>, status = 200) => Response.json(corpo, { status });

function configuracao() {
  const env = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  const faltando = Object.entries(env)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  return { env, faltando };
}

/** Confere o login e a autorização da pessoa (as regras do banco valem para a consulta). */
async function autenticar(req: Request, url: string, chaveAnon: string): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(url, chaveAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: usuario, error } = await sb.auth.getUser(token);
  const email = usuario.user?.email?.toLowerCase();
  if (error || !email) return null;
  const { data } = await sb.from("autorizados").select("email");
  return (data ?? []).some((p) => String(p.email).toLowerCase() === email) ? email : null;
}

type Contexto =
  | { falta: string[] }
  | { naoAutorizado: true }
  | { email: string; servico: SupabaseClient; bot: string; segredo: string };

async function contexto(req: Request): Promise<Contexto> {
  const { env, faltando } = configuracao();
  // Sem o básico do Supabase não dá nem para conferir o login.
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { falta: faltando };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  // O login vem antes: quem não está autorizado não vê nem o que falta configurar.
  const email = await autenticar(req, url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!email) return { naoAutorizado: true };
  if (faltando.length > 0) return { falta: faltando };
  const servico = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return { email, servico, bot: env.TELEGRAM_BOT_TOKEN!, segredo: env.CRON_SECRET! };
}

async function chatDe(servico: SupabaseClient, email: string): Promise<string | null> {
  const { data } = await servico.from("autorizados").select("telegram_chat_id").eq("email", email).maybeSingle();
  const id = (data as { telegram_chat_id?: string | null } | null)?.telegram_chat_id;
  return id ? String(id) : null;
}

/** Situação da conexão e link para abrir o bot. */
export async function GET(req: Request) {
  const c = await contexto(req);
  if ("falta" in c) return resposta({ configurado: false, faltando: c.falta });
  if ("naoAutorizado" in c) return resposta({ erro: "Entre novamente." }, 401);
  const eu = await chamarTelegram<{ username: string }>(c.bot, "getMe");
  if (!eu.ok || !eu.result) return resposta({ configurado: false, erro: "O token do bot do Telegram parece inválido." });
  return resposta({
    configurado: true,
    bot: eu.result.username,
    vinculado: Boolean(await chatDe(c.servico, c.email)),
    link: `https://t.me/${eu.result.username}?start=${tokenVinculo(c.email, c.segredo)}`,
  });
}

export async function POST(req: Request) {
  const c = await contexto(req);
  if ("falta" in c) return resposta({ erro: `Faltam variáveis no servidor: ${c.falta.join(", ")}` }, 503);
  if ("naoAutorizado" in c) return resposta({ erro: "Entre novamente." }, 401);
  const corpo = (await req.json().catch(() => ({}))) as { acao?: string };

  if (corpo.acao === "verificar") {
    // Procura a mensagem "/start <código>" que a pessoa enviou ao bot e guarda a conversa dela.
    const up = await chamarTelegram<Atualizacao[]>(c.bot, "getUpdates", { limit: 100, allowed_updates: ["message"] });
    if (!up.ok) return resposta({ vinculado: false, erro: `O Telegram não respondeu: ${up.description ?? "erro desconhecido"}.` });
    const alvo = `/start ${tokenVinculo(c.email, c.segredo)}`;
    const achada = [...(up.result ?? [])].reverse().find((u) => u.message?.text?.trim() === alvo && u.message.chat.type === "private");
    if (!achada?.message) {
      return resposta({ vinculado: false, erro: "Ainda não encontrei sua mensagem. Abra o bot pelo botão, toque em Iniciar (Start) e tente de novo." });
    }
    const chatId = String(achada.message.chat.id);
    const { error } = await c.servico.from("autorizados").update({ telegram_chat_id: chatId }).eq("email", c.email);
    if (error) return resposta({ vinculado: false, erro: "Não consegui salvar a conexão. O SQL 08 foi rodado no Supabase?" }, 500);
    await enviarMensagem(c.bot, chatId, "✅ <b>o-ebanq conectado!</b>\nVocê vai receber aqui os avisos de fechamento e vencimento dos cartões.");
    return resposta({ vinculado: true, mensagem: "Telegram conectado! Enviei uma mensagem de confirmação." });
  }

  if (corpo.acao === "teste") {
    const chatId = await chatDe(c.servico, c.email);
    if (!chatId) return resposta({ erro: "O Telegram ainda não está conectado." }, 400);
    const r = await enviarMensagem(c.bot, chatId, `🔔 <b>Teste</b>\n${esc("Se você leu esta mensagem, os alertas do o-ebanq estão funcionando.")}`);
    return r.ok ? resposta({ mensagem: "Mensagem de teste enviada." }) : resposta({ erro: `O Telegram recusou o envio: ${r.description ?? "erro"}.` }, 502);
  }

  if (corpo.acao === "desvincular") {
    const { error } = await c.servico.from("autorizados").update({ telegram_chat_id: null }).eq("email", c.email);
    return error ? resposta({ erro: "Não consegui desconectar." }, 500) : resposta({ mensagem: "Telegram desconectado." });
  }

  return resposta({ erro: "Ação inválida." }, 400);
}
