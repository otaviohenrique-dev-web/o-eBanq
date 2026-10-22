import { faturaDaCompra, proximoVencimento, type Conta, type Transacao } from "./finance";

export type Urgencia = "hoje" | "urgente" | "atencao" | "calmo";

/** Situação de um cartão: o valor da próxima fatura e as datas de vencimento e fechamento. */
export type AlertaCartao = {
  contaId: string;
  contaNome: string;
  donoEmail: string;
  /** Próximo vencimento (YYYY-MM-DD) e dias até ele (0 = hoje). */
  vence: string;
  diasVence: number;
  urgencia: Urgencia;
  /** Próximo fechamento e dias até ele. */
  fecha: string;
  diasFecha: number;
  urgenciaFecha: Urgencia;
  /** A fatura que vence primeiro já fechou: o valor é o final. Se não, ainda pode subir até o fechamento. */
  fechada: boolean;
  /** Valor da próxima fatura (parcelas e assinaturas ainda não pagas). */
  valorFatura: number;
  /** Parte desse valor que é de outras pessoas (cartão emprestado). */
  valorTerceiros: number;
  /** Vencimento da fatura em que cairão as compras feitas a partir do próximo fechamento. */
  vencimentoSeguinte: string;
};

/** Dias de `de` até `ate` (datas YYYY-MM-DD; positivo se `ate` é depois). */
export function diasEntre(de: string, ate: string): number {
  const [a, b, c] = de.split("-").map(Number);
  const [x, y, z] = ate.split("-").map(Number);
  return Math.round((Date.UTC(x, y - 1, z) - Date.UTC(a, b - 1, c)) / 86_400_000);
}

export const urgenciaDe = (dias: number): Urgencia => (dias <= 0 ? "hoje" : dias <= 3 ? "urgente" : dias <= 7 ? "atencao" : "calmo");

/** Só dia e mês: nos avisos de poucos dias o ano é óbvio. */
const diaMes = (d: string) => d.slice(5).split("-").reverse().join("/");

/** Um alerta por cartão configurado (com fechamento e vencimento), do vencimento mais próximo ao mais distante. */
export function alertasDeCartoes(contas: Conta[], todas: Transacao[], hojeStr: string): AlertaCartao[] {
  const lista: AlertaCartao[] = [];
  for (const c of contas) {
    if (!c.dia_fechamento || !c.dia_vencimento) continue;
    const fecha = proximoVencimento(hojeStr, c.dia_fechamento);
    const vence = proximoVencimento(hojeStr, c.dia_vencimento);
    const naFatura = todas.filter(
      (t) =>
        t.conta_id === c.id &&
        !t.paga &&
        (t.origem === "parcela" || t.origem === "assinatura") &&
        t.data.startsWith(vence.slice(0, 7)),
    );
    const diasVence = diasEntre(hojeStr, vence);
    const diasFecha = diasEntre(hojeStr, fecha);
    lista.push({
      contaId: c.id,
      contaNome: c.nome,
      donoEmail: c.autor_email,
      vence,
      diasVence,
      urgencia: urgenciaDe(diasVence),
      fecha,
      diasFecha,
      urgenciaFecha: urgenciaDe(diasFecha),
      // Se o próximo fechamento vem depois do próximo vencimento, a fatura que vence agora já fechou.
      fechada: diasFecha > diasVence,
      valorFatura: naFatura.reduce((acc, t) => acc + t.valor, 0),
      valorTerceiros: naFatura.filter((t) => t.terceiro_id).reduce((acc, t) => acc + t.valor, 0),
      vencimentoSeguinte: faturaDaCompra(fecha, c.dia_fechamento, c.dia_vencimento).vencimento,
    });
  }
  return lista.sort((a, b) => a.diasVence - b.diasVence);
}

export function quando(a: { dias: number; data: string }): string {
  if (a.dias <= 0) return "HOJE";
  if (a.dias === 1) return `amanhã (${diaMes(a.data)})`;
  return `em ${a.dias} dias (${diaMes(a.data)})`;
}
