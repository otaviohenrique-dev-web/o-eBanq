import { faturaDaCompra, proximoVencimento, type Conta, type Transacao } from "./finance";

export type Urgencia = "hoje" | "urgente" | "atencao" | "calmo";

export type Alerta = {
  /** Identifica o aviso: tipo, cartão, data e antecedência. */
  chave: string;
  tipo: "fechamento" | "vencimento";
  contaId: string;
  contaNome: string;
  donoEmail: string;
  /** Data do fechamento ou do vencimento (YYYY-MM-DD). */
  data: string;
  /** Dias até a data (0 = hoje). */
  dias: number;
  urgencia: Urgencia;
  /** Vencimento: total da fatura ainda não paga. */
  valorFatura: number;
  /** Vencimento: parte da fatura que é de outras pessoas (cartão emprestado). */
  valorTerceiros: number;
  /** Fechamento: vencimento da fatura em que cairão as compras feitas a partir do fechamento. */
  vencimentoSeguinte: string | null;
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

/** Próximo fechamento e vencimento de cada cartão configurado, ordenados do mais próximo ao mais distante. */
export function alertasDeCartoes(contas: Conta[], todas: Transacao[], hojeStr: string): Alerta[] {
  const lista: Alerta[] = [];
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
    const diasFecha = diasEntre(hojeStr, fecha);
    const diasVence = diasEntre(hojeStr, vence);
    lista.push(
      {
        chave: `fechamento:${c.id}:${fecha}:${diasFecha}`,
        tipo: "fechamento",
        contaId: c.id,
        contaNome: c.nome,
        donoEmail: c.autor_email,
        data: fecha,
        dias: diasFecha,
        urgencia: urgenciaDe(diasFecha),
        valorFatura: 0,
        valorTerceiros: 0,
        vencimentoSeguinte: faturaDaCompra(fecha, c.dia_fechamento, c.dia_vencimento).vencimento,
      },
      {
        chave: `vencimento:${c.id}:${vence}:${diasVence}`,
        tipo: "vencimento",
        contaId: c.id,
        contaNome: c.nome,
        donoEmail: c.autor_email,
        data: vence,
        dias: diasVence,
        urgencia: urgenciaDe(diasVence),
        valorFatura: naFatura.reduce((acc, t) => acc + t.valor, 0),
        valorTerceiros: naFatura.filter((t) => t.terceiro_id).reduce((acc, t) => acc + t.valor, 0),
        vencimentoSeguinte: null,
      },
    );
  }
  return lista.sort((a, b) => a.dias - b.dias || a.tipo.localeCompare(b.tipo));
}

export function quando(a: Pick<Alerta, "dias" | "data">): string {
  if (a.dias <= 0) return "HOJE";
  if (a.dias === 1) return `amanhã (${diaMes(a.data)})`;
  return `em ${a.dias} dias (${diaMes(a.data)})`;
}
