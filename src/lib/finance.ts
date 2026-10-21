export type Categoria = "necessidade" | "lazer" | "economia";
export type Escopo = "pessoal" | "casal";

export type Transacao = {
  id: string;
  autor_email: string;
  escopo: Escopo;
  tipo: "entrada" | "saida";
  descricao: string;
  valor: number;
  categoria: Categoria;
  data: string; // YYYY-MM-DD
  /** Preenchido nos lançamentos gerados automaticamente (renda fixa ou parcela). */
  origem?: "fixa" | "parcela" | "assinatura" | "reembolso";
  refId?: string;
  conta_id?: string | null;
  /** Parcela paga antes do vencimento (já está na data em que foi paga). */
  adiantada?: boolean;
  /** Parcela com pagamento registrado (no vencimento ou antes). */
  paga?: boolean;
  /** E-mail de quem pagou; se vazio, quem pagou foi o autor. */
  pago_por?: string | null;
  /** Compra no seu cartão que pertence a outra pessoa: não entra no seu orçamento. */
  terceiro_id?: string | null;
};

export type RendaFixa = {
  id: string;
  autor_email: string;
  descricao: string;
  valor: number;
  dia: number;
  inicio: string; // YYYY-MM
  fim: string | null; // YYYY-MM, inclusive
  conta_id?: string | null;
};

export type Parcelamento = {
  id: string;
  autor_email: string;
  escopo: Escopo;
  descricao: string;
  valor_total: number;
  parcelas: number;
  primeira: string; // YYYY-MM
  categoria: Categoria;
  conta_id?: string | null;
  data_compra?: string | null;
  /** Dia do vencimento do cartão usado (copiado na criação). */
  dia_vencimento?: number | null;
  terceiro_id?: string | null;
};

/** Pessoa que usa o seu cartão emprestado. */
export type Terceiro = { id: string; autor_email: string; nome: string };

/** Dinheiro que um terceiro devolveu. */
export type Repasse = { id: string; autor_email: string; terceiro_id: string; valor: number; data: string; conta_id?: string | null };

/** Cobrança mensal sem número de parcelas, até ser cancelada. */
export type Assinatura = {
  id: string;
  autor_email: string;
  escopo: Escopo;
  descricao: string;
  valor_mensal: number;
  categoria: Categoria;
  conta_id?: string | null;
  terceiro_id?: string | null;
  inicio: string; // YYYY-MM
  fim: string | null; // YYYY-MM, inclusive
  dia_vencimento?: number | null;
  data_compra?: string | null;
};

/** Parcela paga antes do vencimento. */
export type Adiantada = {
  id: string;
  autor_email: string;
  parcelamento_id: string;
  indice: number;
  pago_em: string;
  valor_pago: number;
  /** Quem pagou (e-mail); se vazio, foi o dono da compra. */
  pago_por?: string | null;
  /** Banco de onde saiu o dinheiro. */
  pago_com_conta_id?: string | null;
};

/** Banco ou conta de uma pessoa: serve de "tag" para rastrear onde o dinheiro está. */
export type Conta = {
  id: string;
  autor_email: string;
  nome: string;
  cor: string;
  saldo_inicial: number;
  /** Cartão de crédito: dia em que a fatura fecha e dia em que vence. */
  dia_fechamento?: number | null;
  dia_vencimento?: number | null;
};

export const CORES_CONTA = ["#2a78d6", "#eb6834", "#1baf7a", "#e87ba4", "#6250d6", "#eda100", "#e34948", "#008300"];

export const BANCOS_COMUNS = [
  "Nubank",
  "Itaú",
  "Bradesco",
  "Banco do Brasil",
  "Caixa",
  "Santander",
  "Inter",
  "C6 Bank",
  "Mercado Pago",
  "PicPay",
  "Dinheiro (carteira)",
];

export type Pessoa = { email: string; nome: string };

// Regra 50/30/20
export const REGRA: Record<Categoria, number> = {
  necessidade: 0.5,
  lazer: 0.3,
  economia: 0.2,
};

export const ROTULO: Record<Categoria, string> = {
  necessidade: "Necessidades",
  lazer: "Lazer e desejos",
  economia: "Economias",
};

export const CATEGORIAS = Object.keys(REGRA) as Categoria[];

/** Teto de comprometimento da renda com parcelas, pela regra do projeto. */
export const TETO_PARCELAS = 0.2;

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function parseValor(texto: string): number {
  const t = texto.trim();
  const normalizado = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : NaN;
}

const p2 = (n: number) => String(n).padStart(2, "0");

export function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export function addMeses(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
}

/** Quantos meses de `a` até `b` (positivo se `b` é depois de `a`). */
export function difMeses(a: string, b: string): number {
  const [aa, am] = a.split("-").map(Number);
  const [ba, bm] = b.split("-").map(Number);
  return (ba - aa) * 12 + (bm - am);
}

export function rotuloMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/** Os últimos `n` meses (YYYY-MM) até `ate`, do mais antigo ao mais recente. */
export function ultimosMeses(n: number, ate: string): string[] {
  return Array.from({ length: n }, (_, i) => addMeses(ate, i - (n - 1)));
}

const arredonda = (n: number) => Math.round(n * 100) / 100;

/** Valor da parcela `k` (0 = primeira); a última absorve os centavos do arredondamento. */
export function valorDaParcela(p: Parcelamento, k: number): number {
  const base = Math.floor((p.valor_total / p.parcelas) * 100) / 100;
  return k === p.parcelas - 1 ? arredonda(p.valor_total - base * (p.parcelas - 1)) : base;
}

/** Reparte o valor realmente pago entre as parcelas, proporcional ao valor de cada uma. */
export function distribuirPagamento(valores: number[], pagoTotal: number): number[] {
  const total = valores.reduce((a, b) => a + b, 0);
  let acumulado = 0;
  return valores.map((v, i) => {
    if (i === valores.length - 1) return Math.max(0, arredonda(pagoTotal - acumulado));
    const parte = total > 0 ? arredonda((pagoTotal * v) / total) : arredonda(pagoTotal / valores.length);
    acumulado = arredonda(acumulado + parte);
    return parte;
  });
}

/** Data de vencimento da parcela `k` (usa o dia do cartão, ou o dia 1 se não houver cartão). */
export const vencimentoDaParcela = (p: Parcelamento, k: number) => `${addMeses(p.primeira, k)}-${p2(p.dia_vencimento ?? 1)}`;

/** Índices das parcelas ainda a pagar a partir de `mes` (inclusive), sem as adiantadas. */
export function pendentes(p: Parcelamento, mes: string, adiantadas: Adiantada[]): number[] {
  const feitas = new Set(adiantadas.filter((a) => a.parcelamento_id === p.id).map((a) => a.indice));
  const lista: number[] = [];
  for (let k = Math.max(0, difMeses(p.primeira, mes)); k < p.parcelas; k++) if (!feitas.has(k)) lista.push(k);
  return lista;
}

/**
 * Fatura do cartão em que cai uma compra: do dia do fechamento em diante ela vai para a fatura
 * seguinte. Se o vencimento é depois do fechamento, vence no mesmo mês em que a fatura fecha;
 * senão, no mês seguinte.
 */
export function faturaDaCompra(dataCompra: string, fechamento: number, vencimento: number): { mes: string; vencimento: string } {
  const [a, m, d] = dataCompra.split("-").map(Number);
  const ym = `${a}-${p2(m)}`;
  const fechaEm = d >= fechamento ? addMeses(ym, 1) : ym;
  const venceEm = vencimento > fechamento ? fechaEm : addMeses(fechaEm, 1);
  return { mes: venceEm, vencimento: `${venceEm}-${p2(vencimento)}` };
}

/** Próximo vencimento do cartão a partir de `hoje` (inclusive). */
export function proximoVencimento(hoje: string, diaVencimento: number): string {
  const ym = hoje.slice(0, 7);
  const candidato = `${ym}-${p2(diaVencimento)}`;
  return candidato >= hoje ? candidato : `${addMeses(ym, 1)}-${p2(diaVencimento)}`;
}

/**
 * Junta os lançamentos reais com os gerados: a renda fixa vira uma entrada em cada mês
 * ativo (até `ateMes`) e cada compra a prazo vira uma saída por parcela, no dia do vencimento.
 * Parcelas adiantadas saem da fatura original e entram na data em que foram pagas.
 */
export function expandir(
  ts: Transacao[],
  rendas: RendaFixa[],
  parcelamentos: Parcelamento[],
  ateMes: string,
  adiantadas: Adiantada[] = [],
  extras: { assinaturas?: Assinatura[]; repasses?: Repasse[]; terceiros?: Terceiro[] } = {},
): Transacao[] {
  const geradas: Transacao[] = [];
  for (const r of rendas) {
    const ultimo = r.fim && r.fim < ateMes ? r.fim : ateMes;
    for (let m = r.inicio; m <= ultimo; m = addMeses(m, 1)) {
      geradas.push({
        id: `fixa-${r.id}-${m}`,
        autor_email: r.autor_email,
        escopo: "pessoal",
        tipo: "entrada",
        descricao: r.descricao,
        valor: r.valor,
        categoria: "necessidade",
        data: `${m}-${p2(r.dia)}`,
        origem: "fixa",
        refId: r.id,
        conta_id: r.conta_id ?? null,
      });
    }
  }
  const feitas = new Map(adiantadas.map((a) => [`${a.parcelamento_id}-${a.indice}`, a]));
  for (const p of parcelamentos) {
    for (let k = 0; k < p.parcelas; k++) {
      const ad = feitas.get(`${p.id}-${k}`);
      const pagador = ad ? (ad.pago_por ?? p.autor_email) : p.autor_email;
      // Se outra pessoa pagou e não informou o banco, não dá para saber de onde saiu: fica sem banco.
      const conta = ad ? (ad.pago_com_conta_id ?? (pagador === p.autor_email ? (p.conta_id ?? null) : null)) : (p.conta_id ?? null);
      geradas.push({
        id: `parcela-${p.id}-${k}`,
        autor_email: p.autor_email,
        escopo: p.escopo,
        tipo: "saida",
        descricao: p.parcelas === 1 ? p.descricao : `${p.descricao} (${k + 1}/${p.parcelas})`,
        valor: ad ? ad.valor_pago : valorDaParcela(p, k),
        categoria: p.categoria,
        data: ad ? ad.pago_em : vencimentoDaParcela(p, k),
        origem: "parcela",
        refId: p.id,
        conta_id: conta,
        adiantada: Boolean(ad && ad.pago_em < vencimentoDaParcela(p, k)),
        paga: Boolean(ad),
        pago_por: ad ? pagador : null,
        terceiro_id: p.terceiro_id ?? null,
      });
    }
  }
  for (const a of extras.assinaturas ?? []) {
    const ultimo = a.fim && a.fim < ateMes ? a.fim : ateMes;
    for (let m = a.inicio; m <= ultimo; m = addMeses(m, 1)) {
      geradas.push({
        id: `assinatura-${a.id}-${m}`,
        autor_email: a.autor_email,
        escopo: a.escopo,
        tipo: "saida",
        descricao: a.descricao,
        valor: a.valor_mensal,
        categoria: a.categoria,
        data: `${m}-${p2(a.dia_vencimento ?? 1)}`,
        origem: "assinatura",
        refId: a.id,
        conta_id: a.conta_id ?? null,
        terceiro_id: a.terceiro_id ?? null,
      });
    }
  }
  // Dinheiro devolvido por terceiros: entra no saldo do banco, mas não conta como renda.
  const nomes = new Map((extras.terceiros ?? []).map((t) => [t.id, t.nome]));
  for (const r of extras.repasses ?? []) {
    geradas.push({
      id: `repasse-${r.id}`,
      autor_email: r.autor_email,
      escopo: "pessoal",
      tipo: "entrada",
      descricao: `Repasse de ${nomes.get(r.terceiro_id) ?? "terceiro"}`,
      valor: r.valor,
      categoria: "necessidade",
      data: r.data,
      origem: "reembolso",
      refId: r.id,
      conta_id: r.conta_id ?? null,
      terceiro_id: r.terceiro_id,
    });
  }
  return [...ts, ...geradas];
}

/** Saldo de cada conta: saldo inicial + entradas - saídas com data até `ate` (YYYY-MM-DD). */
export function saldoPorConta(todas: Transacao[], contas: Conta[], ate: string): Map<string, number> {
  const mapa = new Map(contas.map((c) => [c.id, c.saldo_inicial]));
  for (const t of todas) {
    if (!t.conta_id || t.data > ate || !mapa.has(t.conta_id)) continue;
    mapa.set(t.conta_id, (mapa.get(t.conta_id) ?? 0) + (t.tipo === "entrada" ? t.valor : -t.valor));
  }
  return mapa;
}

export const noMes = (ts: Transacao[], mes: string) => ts.filter((t) => t.data.startsWith(mes));

const soma = (ts: Transacao[]) => ts.reduce((acc, t) => acc + t.valor, 0);

export type Resumo = {
  entradas: number;
  /** Parte das entradas vinda da renda fixa. */
  fixa: number;
  /** Parte das entradas avulsas (renda variável) já recebida no mês. */
  variavel: number;
  saidas: number;
  /** Total de parcelas de compras a prazo que vencem no mês. */
  parcelas: number;
  saldo: number;
  /** Renda usada para calcular os limites 50/30/20. */
  base: number;
  /** Média mensal da renda variável nos 3 meses anteriores. */
  mediaVariavel: number;
  gasto: Record<Categoria, number>;
  limite: Record<Categoria, number>;
};

function limitesDe(base: number): Record<Categoria, number> {
  return {
    necessidade: base * REGRA.necessidade,
    lazer: base * REGRA.lazer,
    economia: base * REGRA.economia,
  };
}

export function resumir(ts: Transacao[]): Resumo {
  // Compras de terceiros no seu cartão e repasses recebidos não entram no orçamento.
  const entradasTs = ts.filter((t) => t.tipo === "entrada" && t.origem !== "reembolso");
  const saidas = ts.filter((t) => t.tipo === "saida" && !t.terceiro_id);
  const entradas = soma(entradasTs);
  const gasto = {
    necessidade: soma(saidas.filter((t) => t.categoria === "necessidade")),
    lazer: soma(saidas.filter((t) => t.categoria === "lazer")),
    economia: soma(saidas.filter((t) => t.categoria === "economia")),
  };
  const total = gasto.necessidade + gasto.lazer + gasto.economia;
  return {
    entradas,
    fixa: soma(entradasTs.filter((t) => t.origem === "fixa")),
    variavel: soma(entradasTs.filter((t) => !t.origem)),
    saidas: total,
    parcelas: soma(saidas.filter((t) => t.origem === "parcela")),
    saldo: entradas - total,
    base: entradas,
    mediaVariavel: 0,
    gasto,
    limite: limitesDe(entradas),
  };
}

/**
 * Resumo de um mês. Os limites usam a renda fixa mais a renda variável esperada:
 * o maior entre o que já entrou no mês e a média dos 3 meses anteriores. Assim, no início
 * do mês (antes de entrar o dinheiro avulso) os limites não ficam zerados.
 */
export function resumirMes(todas: Transacao[], mes: string, filtro: (t: Transacao) => boolean = () => true): Resumo {
  const minhas = todas.filter(filtro);
  const r = resumir(noMes(minhas, mes));
  const anteriores = [1, 2, 3].map((i) =>
    soma(noMes(minhas, addMeses(mes, -i)).filter((t) => t.tipo === "entrada" && !t.origem)),
  );
  const media = (anteriores[0] + anteriores[1] + anteriores[2]) / 3;
  const base = r.fixa + Math.max(r.variavel, media);
  return { ...r, base, mediaVariavel: media, limite: limitesDe(base) };
}

export type Acerto = { de: Pessoa; para: Pessoa; valor: number } | null;

/**
 * Acerto entre o casal no mês. Gastos do casal são rateados pela renda de cada um; gastos pessoais
 * pagos por outra pessoa são devidos por inteiro ao dono. Quem pagou é `pago_por` (ou o autor).
 */
export function dividirGastos(
  doMes: Transacao[],
  pessoas: [Pessoa, Pessoa],
): {
  totalCasal: number;
  pessoaisPagosPorOutro: number;
  partes: { pessoa: Pessoa; renda: number; devido: number; pago: number }[];
  acerto: Acerto;
} {
  const quemPagou = (t: Transacao) => t.pago_por ?? t.autor_email;
  const saidas = doMes.filter((t) => t.tipo === "saida" && !t.terceiro_id);
  const casais = saidas.filter((t) => t.escopo === "casal");
  const pessoaisDeOutro = saidas.filter((t) => t.escopo === "pessoal" && quemPagou(t) !== t.autor_email);
  const totalCasal = soma(casais);
  const rendas = pessoas.map((p) => soma(doMes.filter((t) => t.tipo === "entrada" && t.origem !== "reembolso" && t.autor_email === p.email)));
  const rendaTotal = rendas[0] + rendas[1];
  const partes = pessoas.map((pessoa, i) => ({
    pessoa,
    renda: rendas[i],
    devido:
      (rendaTotal > 0 ? (totalCasal * rendas[i]) / rendaTotal : totalCasal / 2) +
      soma(pessoaisDeOutro.filter((t) => t.autor_email === pessoa.email)),
    pago: soma(casais.filter((t) => quemPagou(t) === pessoa.email)) + soma(pessoaisDeOutro.filter((t) => quemPagou(t) === pessoa.email)),
  }));
  const dif0 = partes[0].devido - partes[0].pago; // positivo: a pessoa 0 deve
  const valor = Math.abs(dif0);
  const acerto: Acerto =
    valor < 0.01
      ? null
      : dif0 > 0
        ? { de: pessoas[0], para: pessoas[1], valor }
        : { de: pessoas[1], para: pessoas[0], valor };
  return { totalCasal, pessoaisPagosPorOutro: soma(pessoaisDeOutro), partes, acerto };
}

export type DividaTerceiro = {
  terceiro: Terceiro;
  /** Compras dele que vencem no mês (parcelas, 1x no crédito e assinaturas). */
  itens: Transacao[];
  devidoMes: number;
  repassadoMes: number;
  /** Quanto ainda falta devolver, somando todos os meses até o fim do mês selecionado. */
  emAberto: number;
  repasses: Repasse[];
};

/** Quanto cada pessoa que usa o seu cartão deve repassar no mês e no total até ele. */
export function dividasDeTerceiros(todas: Transacao[], terceiros: Terceiro[], repasses: Repasse[], mes: string): DividaTerceiro[] {
  const fimMes = `${mes}-31`;
  return terceiros.map((terceiro) => {
    const saidas = todas.filter((t) => t.tipo === "saida" && t.terceiro_id === terceiro.id);
    const rs = repasses.filter((r) => r.terceiro_id === terceiro.id);
    const somaR = (lista: Repasse[]) => lista.reduce((acc, r) => acc + r.valor, 0);
    const itens = saidas.filter((t) => t.data.startsWith(mes)).sort((a, b) => a.data.localeCompare(b.data));
    return {
      terceiro,
      itens,
      devidoMes: arredonda(soma(itens)),
      repassadoMes: arredonda(somaR(rs.filter((r) => r.data.startsWith(mes)))),
      emAberto: arredonda(soma(saidas.filter((t) => t.data <= fimMes)) - somaR(rs.filter((r) => r.data <= fimMes))),
      repasses: [...rs].sort((a, b) => b.data.localeCompare(a.data)),
    };
  });
}

export type Parecer = { nivel: "ok" | "atencao" | "nao"; texto: string };

export function podeComprar(r: Resumo, categoria: Categoria, valor: number, parcelas: number): Parecer {
  if (r.base <= 0) {
    return { nivel: "atencao", texto: "Cadastre seu salário ou uma entrada para calcular os limites." };
  }
  const parcela = valor / parcelas;
  const livre = r.limite[categoria] - r.gasto[categoria];
  const sobra = livre - parcela;
  const nome = ROTULO[categoria];
  const disponivel = r.base - r.saidas;
  if (disponivel - parcela < 0) {
    return { nivel: "nao", texto: `Não recomendado: ${brl(parcela)} deste mês é maior que o disponível estimado de ${brl(disponivel)}.` };
  }
  if (sobra < 0) {
    return { nivel: "nao", texto: `Não recomendado: estoura o limite de ${nome} em ${brl(-sobra)} (livre: ${brl(livre)}).` };
  }
  const comprometido = r.parcelas + parcela;
  if (parcelas > 1 && comprometido / r.base > TETO_PARCELAS) {
    return {
      nivel: "atencao",
      texto: `Atenção: com esta compra suas parcelas somam ${brl(comprometido)} por mês (${Math.round((comprometido / r.base) * 100)}% da renda; o ideal é até ${TETO_PARCELAS * 100}%).`,
    };
  }
  if (r.limite[categoria] > 0 && sobra / r.limite[categoria] < 0.2) {
    return { nivel: "atencao", texto: `Atenção: cabe, mas deixa só ${brl(sobra)} livres em ${nome} neste mês.` };
  }
  return { nivel: "ok", texto: `Pode comprar: sobram ${brl(sobra)} em ${nome} neste mês.` };
}

export type ItemFatura = { descricao: string; valor: number; categoria: Categoria; escopo: Escopo; autor_email: string };
export type Estrategia = { titulo: string; texto: string };

export type PlanoParcelas = {
  mesFatura: string;
  faturaAtual: number;
  proximaFatura: number;
  itensProxima: ItemFatura[];
  /** Total de parcelas e peso na renda nos próximos 6 meses, a partir do mês selecionado. */
  meses: { mes: string; total: number; pct: number }[];
  /** Quanto ainda cabe em novas parcelas neste mês mantendo o teto (negativo = acima do teto). */
  folga: number;
  estrategias: Estrategia[];
};

/**
 * Acompanha as compras a prazo e sugere como pagá-las. `parcelasTs` são as parcelas já
 * geradas (origem "parcela") do recorte em análise e `base` é a renda usada nos limites.
 */
export function planejarParcelas(
  parcelamentos: Parcelamento[],
  parcelasTs: Transacao[],
  mes: string,
  base: number,
  adiantadas: Adiantada[] = [],
): PlanoParcelas {
  const totalMes = (m: string) => soma(parcelasTs.filter((t) => t.data.startsWith(m)));
  const proxMes = addMeses(mes, 1);
  const faturaAtual = totalMes(mes);
  const meses = Array.from({ length: 6 }, (_, i) => {
    const m = addMeses(mes, i);
    const total = totalMes(m);
    return { mes: m, total, pct: base > 0 ? total / base : 0 };
  });
  const itensProxima = parcelasTs
    .filter((t) => t.data.startsWith(proxMes))
    .map((t) => ({ descricao: t.descricao, valor: t.valor, categoria: t.categoria, escopo: t.escopo, autor_email: t.autor_email }));

  const teto = base * TETO_PARCELAS;
  const folga = teto - faturaAtual;

  // Só entram nas estratégias de quitação as compras que já começaram e ainda têm parcelas a pagar.
  const emCurso = parcelamentos
    .map((p) => {
      const pend = pendentes(p, mes, adiantadas);
      const saldo = pend.reduce((acc, k) => acc + valorDaParcela(p, k), 0);
      const fim = addMeses(p.primeira, pend.length > 0 ? pend[pend.length - 1] : 0);
      return { p, pos: difMeses(p.primeira, mes) + 1, restantes: pend.length, parcela: p.valor_total / p.parcelas, saldo, fim };
    })
    .filter((a) => a.pos >= 1 && a.restantes > 0);

  const estrategias: Estrategia[] = [];
  if (base <= 0) {
    estrategias.push({ titulo: "Informe sua renda", texto: "Cadastre seu salário ou uma entrada para comparar as parcelas com a renda." });
  } else if (folga < 0) {
    estrategias.push({
      titulo: "Parcelas acima do teto",
      texto: `Neste mês as parcelas somam ${brl(faturaAtual)} (${Math.round((faturaAtual / base) * 100)}% da renda), ${brl(-folga)} acima do teto de ${TETO_PARCELAS * 100}%. Evite novas compras a prazo até a fatura cair.`,
    });
  } else {
    estrategias.push({
      titulo: "Folga para novas compras",
      texto: `Ainda cabem até ${brl(folga)} por mês em novas parcelas sem passar de ${TETO_PARCELAS * 100}% da renda.`,
    });
  }

  if (emCurso.length > 0) {
    const primeira = [...emCurso].sort((a, b) => a.fim.localeCompare(b.fim))[0];
    estrategias.push({
      titulo: "Próximo alívio na fatura",
      texto: `${primeira.p.descricao} termina em ${rotuloMes(primeira.fim)}. A partir de ${rotuloMes(addMeses(primeira.fim, 1))} a fatura cai cerca de ${brl(primeira.parcela)} por mês.`,
    });
  }
  if (emCurso.length >= 2) {
    const menor = [...emCurso].sort((a, b) => a.saldo - b.saldo)[0];
    estrategias.push({
      titulo: "Quitar primeiro a menor dívida",
      texto: `${menor.p.descricao} é a de menor saldo (faltam ${brl(menor.saldo)} em ${menor.restantes} parcelas). Quitá-la libera ${brl(menor.parcela)} por mês mais rápido. Ao antecipar parcelas, peça o desconto de juros.`,
    });
    const maior = [...emCurso].sort((a, b) => b.parcela - a.parcela)[0];
    if (maior.p.id !== menor.p.id) {
      estrategias.push({
        titulo: "Aliviar o caixa mensal",
        texto: `Para sobrar mais dinheiro por mês, antecipe ${maior.p.descricao}: é a maior parcela (${brl(maior.parcela)}) e faltam ${brl(maior.saldo)}.`,
      });
    }
  }
  return { mesFatura: proxMes, faturaAtual, proximaFatura: totalMes(proxMes), itensProxima, meses, folga, estrategias };
}

const SEM_ACENTO = /[\u0300-\u036f]/g;
const PALAVRAS: Record<Categoria, string[]> = {
  necessidade: [
    "aluguel", "condominio", "luz", "energia", "agua", "internet", "mercado", "supermercado", "feira", "farmacia",
    "remedio", "saude", "consulta", "plano de saude", "escola", "faculdade", "curso", "transporte", "gasolina",
    "combustivel", "onibus", "uber", "geladeira", "fogao", "maquina de lavar", "colchao", "cama", "pneu", "seguro",
    "iptu", "ipva", "conserto", "reforma", "gas",
  ],
  lazer: [
    "tv", "televisao", "videogame", "playstation", "xbox", "viagem", "passagem", "hotel", "restaurante", "ifood",
    "cinema", "show", "ingresso", "roupa", "tenis", "sapato", "perfume", "presente", "netflix", "spotify", "streaming",
    "festa", "bar", "pizza", "hamburguer", "jogo", "brinquedo",
  ],
  economia: ["investimento", "tesouro", "cdb", "poupanca", "reserva", "previdencia", "aporte", "cofrinho"],
};

/** Sugere a categoria pelo que foi comprado (só uma dica: a decisão é da pessoa). */
export function sugerirCategoria(descricao: string): Categoria | null {
  const texto = ` ${descricao.toLowerCase().normalize("NFD").replace(SEM_ACENTO, "")} `;
  for (const cat of ["economia", "necessidade", "lazer"] as Categoria[]) {
    if (PALAVRAS[cat].some((w) => texto.includes(` ${w} `) || texto.includes(` ${w}s `) || (w.length > 4 && texto.includes(w)))) return cat;
  }
  return null;
}
