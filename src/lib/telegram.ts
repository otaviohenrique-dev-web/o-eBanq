import { createHash, createHmac, timingSafeEqual } from "node:crypto";

type RespostaTelegram<T> = { ok: boolean; result?: T; description?: string };

/** Chama a API de bots do Telegram. Nunca lança erro: devolve { ok: false } se algo falhar. */
export async function chamarTelegram<T = unknown>(token: string, metodo: string, corpo: Record<string, unknown> = {}): Promise<RespostaTelegram<T>> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(15_000),
    });
    return (await r.json()) as RespostaTelegram<T>;
  } catch {
    return { ok: false, description: "falha de rede ao falar com o Telegram" };
  }
}

/** Código que identifica uma pessoa no link de conexão, sem precisar guardar nada no banco. */
export const tokenVinculo = (email: string, segredo: string) =>
  createHmac("sha256", segredo).update(email.toLowerCase()).digest("hex").slice(0, 32);

/** Comparação de textos em tempo constante (evita descobrir o segredo por tentativa e erro). */
export function iguais(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Escapa o texto para o modo HTML do Telegram. */
export const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const enviarMensagem = (token: string, chatId: string, html: string) =>
  chamarTelegram(token, "sendMessage", { chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true });
