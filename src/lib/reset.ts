import type { Adiantada, Assinatura, Conta, Parcelamento, RendaFixa, Repasse, Terceiro, Transacao } from "./finance";

export type DadosUsuario = {
  transacoes: Transacao[];
  rendas: RendaFixa[];
  parcelamentos: Parcelamento[];
  assinaturas: Assinatura[];
  contas: Conta[];
  terceiros: Terceiro[];
  repasses: Repasse[];
  adiantadas: Adiantada[];
};

export type SelecaoReset = DadosUsuario & { total: number };

/**
 * Quais registros o reset apaga. Espelha a função `resetar_meus_dados` do banco (supabase/10).
 *
 * - `tudo = false`: dados pessoais. Mantém os bancos e o que foi lançado como "do casal".
 * - `tudo = true`: tudo que a pessoa cadastrou, inclusive bancos, itens do casal e os pagamentos de fatura que registrou.
 *
 * Nunca inclui registros de outra pessoa. A única exceção é inevitável: pagamentos que o par registrou
 * sobre uma compra sua que será apagada saem junto com ela (cascata do banco).
 */
export function selecionarParaReset(email: string, d: DadosUsuario, tudo: boolean): SelecaoReset {
  const meu = (x: { autor_email: string }) => x.autor_email === email;
  const escopo = (x: { autor_email: string; escopo: string }) => meu(x) && (tudo || x.escopo === "pessoal");

  const parcelamentos = d.parcelamentos.filter(escopo);
  const idsApagados = new Set(parcelamentos.map((p) => p.id));
  const sel = {
    transacoes: d.transacoes.filter(escopo),
    rendas: d.rendas.filter(meu),
    parcelamentos,
    assinaturas: d.assinaturas.filter(escopo),
    contas: tudo ? d.contas.filter(meu) : [],
    terceiros: d.terceiros.filter(meu),
    repasses: d.repasses.filter(meu),
    adiantadas: d.adiantadas.filter((a) => (tudo && meu(a)) || idsApagados.has(a.parcelamento_id)),
  };
  const total = Object.values(sel).reduce((acc, lista) => acc + lista.length, 0);
  return { ...sel, total };
}

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

/** Linhas "quantidade + nome" para mostrar o que será apagado (só as que têm algo). */
export function resumoDoReset(s: SelecaoReset): { nome: string; quantidade: number }[] {
  return [
    { nome: plural(s.transacoes.length, "lançamento", "lançamentos"), quantidade: s.transacoes.length },
    { nome: plural(s.parcelamentos.length, "compra a prazo", "compras a prazo"), quantidade: s.parcelamentos.length },
    { nome: plural(s.assinaturas.length, "assinatura", "assinaturas"), quantidade: s.assinaturas.length },
    { nome: plural(s.rendas.length, "salário cadastrado", "salários cadastrados"), quantidade: s.rendas.length },
    { nome: plural(s.contas.length, "banco", "bancos"), quantidade: s.contas.length },
    { nome: plural(s.terceiros.length, "pessoa do cartão emprestado", "pessoas do cartão emprestado"), quantidade: s.terceiros.length },
    { nome: plural(s.repasses.length, "repasse", "repasses"), quantidade: s.repasses.length },
    { nome: plural(s.adiantadas.length, "pagamento de fatura", "pagamentos de fatura"), quantidade: s.adiantadas.length },
  ].filter((l) => l.quantidade > 0);
}

/** Cópia dos dados que serão apagados, para a pessoa guardar antes do reset. */
export function copiaEmJson(s: SelecaoReset): string {
  const { total, ...dados } = s;
  void total;
  return JSON.stringify({ app: "o-ebanq", geradoEm: new Date().toISOString(), ...dados }, null, 2);
}

export const PALAVRA_RESET = "APAGAR";

/** A confirmação digitada vale se for a palavra combinada (sem diferenciar maiúsculas nem espaços nas pontas). */
export const confirmacaoValida = (texto: string) => texto.trim().toUpperCase() === PALAVRA_RESET;

/** O botão de apagar só é liberado com a palavra certa, o aviso marcado, algo a apagar e sem apagar em andamento. */
export const podeApagar = (texto: string, entendi: boolean, total: number, apagando: boolean) =>
  confirmacaoValida(texto) && entendi && total > 0 && !apagando;
