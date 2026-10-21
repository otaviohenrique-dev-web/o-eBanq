import { createClient } from "@supabase/supabase-js";
import { alertasDeCartoes, alertasParaEnviar, horizonte, hojeEmSaoPaulo, textoAlerta } from "@/lib/alertas";
import { expandir, type Adiantada, type Assinatura, type Conta, type Parcelamento } from "@/lib/finance";
import { enviarMensagem, esc, iguais } from "@/lib/telegram";

const resposta = (corpo: Record<string, unknown>, status = 200) => Response.json(corpo, { status });

const minusculo = <T extends { autor_email: string }>(x: T) => ({ ...x, autor_email: x.autor_email.toLowerCase() });

/**
 * Chamado todo dia pelo agendador (GitHub Actions) com o segredo CRON_SECRET.
 * Manda no Telegram os avisos de fechamento e vencimento dos cartões que caem nas antecedências combinadas.
 * Use ?simular=1 para ver o que seria enviado sem mandar nada.
 */
export async function POST(req: Request) {
  const segredo = process.env.CRON_SECRET;
  const bot = process.env.TELEGRAM_BOT_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const faltando = Object.entries({ CRON_SECRET: segredo, TELEGRAM_BOT_TOKEN: bot, NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: chaveServico })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (faltando.length > 0) return resposta({ erro: `Faltam variáveis no servidor: ${faltando.join(", ")}` }, 503);
  if (!iguais(req.headers.get("authorization") ?? "", `Bearer ${segredo}`)) return resposta({ erro: "Não autorizado." }, 401);

  const simular = new URL(req.url).searchParams.get("simular") === "1";
  const sb = createClient(url!, chaveServico!, { auth: { persistSession: false, autoRefreshToken: false } });

  const [a, c, p, d, sg] = await Promise.all([
    sb.from("autorizados").select("email,nome,telegram_chat_id"),
    sb.from("contas").select("*"),
    sb.from("parcelamentos").select("*"),
    sb.from("parcelas_adiantadas").select("*"),
    sb.from("assinaturas").select("*"),
  ]);
  const falha = a.error ?? c.error ?? p.error ?? d.error ?? sg.error;
  if (falha) return resposta({ erro: `Não foi possível ler os dados: ${falha.message}` }, 500);

  const hoje = hojeEmSaoPaulo();
  const contas = (c.data ?? []).map((x) => ({ ...minusculo(x), saldo_inicial: Number(x.saldo_inicial) })) as Conta[];
  const parcelamentos = (p.data ?? []).map((x) => ({ ...minusculo(x), valor_total: Number(x.valor_total) })) as Parcelamento[];
  const adiantadas = (d.data ?? []).map((x) => ({
    ...minusculo(x),
    valor_pago: Number(x.valor_pago),
    pago_por: x.pago_por ? String(x.pago_por).toLowerCase() : null,
  })) as Adiantada[];
  const assinaturas = (sg.data ?? []).map((x) => ({ ...minusculo(x), valor_mensal: Number(x.valor_mensal) })) as Assinatura[];

  // Só parcelas e assinaturas importam para o valor da fatura.
  const todas = expandir([], [], parcelamentos, horizonte(hoje, 3), adiantadas, { assinaturas });
  const alertas = alertasDeCartoes(contas, todas, hoje);
  const selecionados = alertasParaEnviar(alertas);

  const nomes = new Map((a.data ?? []).map((x) => [String(x.email).toLowerCase(), String(x.nome ?? x.email)]));
  const destinos = (a.data ?? []).filter((x) => x.telegram_chat_id).map((x) => String(x.telegram_chat_id));

  // Evita repetir um aviso já enviado (por exemplo, se o agendador rodar duas vezes no mesmo dia).
  const chaves = selecionados.map((x) => x.chave);
  const { data: jaEnviados } = chaves.length > 0 ? await sb.from("alertas_enviados").select("chave").in("chave", chaves) : { data: [] };
  const repetidos = new Set((jaEnviados ?? []).map((x) => String(x.chave)));
  const novos = selecionados.filter((x) => !repetidos.has(x.chave));
  const textos = novos.map((x) => textoAlerta(x, nomes.get(x.donoEmail) ?? "titular"));

  const resumo = { hoje, cartoes: contas.filter((x) => x.dia_fechamento && x.dia_vencimento).length, avisosDoDia: selecionados.length, novos: novos.length, destinatarios: destinos.length };
  if (simular) return resposta({ ...resumo, simulacao: true, mensagens: textos });
  if (novos.length === 0) return resposta({ ...resumo, enviados: 0, mensagem: "Nada para avisar hoje." });
  if (destinos.length === 0) return resposta({ ...resumo, enviados: 0, mensagem: "Ninguém conectou o Telegram ainda." });

  const html = `📅 <b>Cartões: datas próximas</b>\n\n${textos.map((t) => `• ${esc(t)}`).join("\n\n")}`;
  const envios = await Promise.all(destinos.map((chat) => enviarMensagem(bot!, chat, html)));
  const enviados = envios.filter((e) => e.ok).length;
  // Só marca como enviado se pelo menos uma pessoa recebeu; assim uma falha tenta de novo na próxima rodada.
  if (enviados > 0) await sb.from("alertas_enviados").upsert(novos.map((x) => ({ chave: x.chave })), { onConflict: "chave" });
  return resposta({ ...resumo, enviados, falhas: envios.length - enviados });
}
