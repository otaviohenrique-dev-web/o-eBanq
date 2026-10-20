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

/** Os últimos `n` meses (YYYY-MM), do mais antigo ao atual. */
export function ultimosMeses(n: number): string[] {
  const d = new Date();
  const lista: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    lista.push(`${m.getFullYear()}-${p2(m.getMonth() + 1)}`);
  }
  return lista;
}

export const noMes = (ts: Transacao[], mes: string) => ts.filter((t) => t.data.startsWith(mes));

const soma = (ts: Transacao[]) => ts.reduce((acc, t) => acc + t.valor, 0);

export type Resumo = {
  entradas: number;
  saidas: number;
  saldo: number;
  gasto: Record<Categoria, number>;
  limite: Record<Categoria, number>;
};

export function resumir(ts: Transacao[]): Resumo {
  const entradas = soma(ts.filter((t) => t.tipo === "entrada"));
  const saidas = ts.filter((t) => t.tipo === "saida");
  const gasto = {
    necessidade: soma(saidas.filter((t) => t.categoria === "necessidade")),
    lazer: soma(saidas.filter((t) => t.categoria === "lazer")),
    economia: soma(saidas.filter((t) => t.categoria === "economia")),
  };
  const total = gasto.necessidade + gasto.lazer + gasto.economia;
  return {
    entradas,
    saidas: total,
    saldo: entradas - total,
    gasto,
    limite: {
      necessidade: entradas * REGRA.necessidade,
      lazer: entradas * REGRA.lazer,
      economia: entradas * REGRA.economia,
    },
  };
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
  if (r.entradas <= 0) {
    return { nivel: "atencao", texto: "Cadastre uma entrada neste mês para calcular os limites." };
  }
  const parcela = valor / parcelas;
  const livre = r.limite[categoria] - r.gasto[categoria];
  const sobra = livre - parcela;
  const nome = ROTULO[categoria];
  if (r.saldo - parcela < 0) {
    return { nivel: "nao", texto: `Não recomendado: ${brl(parcela)} deste mês é maior que o saldo de ${brl(r.saldo)}.` };
  }
  if (sobra < 0) {
    return { nivel: "nao", texto: `Não recomendado: estoura o limite de ${nome} em ${brl(-sobra)} (livre: ${brl(livre)}).` };
  }
  if (r.limite[categoria] > 0 && sobra / r.limite[categoria] < 0.2) {
    return { nivel: "atencao", texto: `Atenção: cabe, mas deixa só ${brl(sobra)} livres em ${nome} neste mês.` };
  }
  return { nivel: "ok", texto: `Pode comprar: sobram ${brl(sobra)} em ${nome} neste mês.` };
}
