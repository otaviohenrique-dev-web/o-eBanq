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
  origem?: "fixa" | "parcela";
  refId?: string;
};

export type RendaFixa = {
  id: string;
  autor_email: string;
  descricao: string;
  valor: number;
  dia: number;
  inicio: string; // YYYY-MM
  fim: string | null; // YYYY-MM, inclusive
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
};

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

/**
 * Junta os lançamentos reais com os gerados: a renda fixa vira uma entrada em cada mês
 * ativo (até `ateMes`) e cada compra a prazo vira uma saída por parcela.
 */
export function expandir(
  ts: Transacao[],
  rendas: RendaFixa[],
  parcelamentos: Parcelamento[],
  ateMes: string,
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
      });
    }
  }
  for (const p of parcelamentos) {
    const base = Math.floor((p.valor_total / p.parcelas) * 100) / 100;
    for (let k = 0; k < p.parcelas; k++) {
      const m = addMeses(p.primeira, k);
      const ultima = k === p.parcelas - 1;
      geradas.push({
        id: `parcela-${p.id}-${k}`,
        autor_email: p.autor_email,
        escopo: p.escopo,
        tipo: "saida",
        descricao: `${p.descricao} (${k + 1}/${p.parcelas})`,
        valor: ultima ? arredonda(p.valor_total - base * (p.parcelas - 1)) : base,
        categoria: p.categoria,
        data: `${m}-01`,
        origem: "parcela",
        refId: p.id,
      });
    }
  }
  return [...ts, ...geradas];
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
  const entradasTs = ts.filter((t) => t.tipo === "entrada");
  const saidas = ts.filter((t) => t.tipo === "saida");
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
 * Divide os gastos do casal proporcionalmente à renda de cada um no mês
 * e diz quem deve a quem para acertar.
 */
export function dividirGastos(
  doMes: Transacao[],
  pessoas: [Pessoa, Pessoa],
): { totalCasal: number; partes: { pessoa: Pessoa; renda: number; devido: number; pago: number }[]; acerto: Acerto } {
  const gastosCasal = doMes.filter((t) => t.tipo === "saida" && t.escopo === "casal");
  const totalCasal = soma(gastosCasal);
  const rendas = pessoas.map((p) => soma(doMes.filter((t) => t.tipo === "entrada" && t.autor_email === p.email)));
  const rendaTotal = rendas[0] + rendas[1];
  const partes = pessoas.map((pessoa, i) => ({
    pessoa,
    renda: rendas[i],
    devido: rendaTotal > 0 ? (totalCasal * rendas[i]) / rendaTotal : totalCasal / 2,
    pago: soma(gastosCasal.filter((t) => t.autor_email === pessoa.email)),
  }));
  const dif0 = partes[0].devido - partes[0].pago; // positivo: a pessoa 0 deve
  const valor = Math.abs(dif0);
  const acerto: Acerto =
    valor < 0.01
      ? null
      : dif0 > 0
        ? { de: pessoas[0], para: pessoas[1], valor }
        : { de: pessoas[1], para: pessoas[0], valor };
  return { totalCasal, partes, acerto };
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
