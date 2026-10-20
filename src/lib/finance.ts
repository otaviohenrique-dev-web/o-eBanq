export type Dono = "a" | "b" | "casal";
export type Categoria = "necessidade" | "lazer" | "economia";

export type Transacao = {
  id: string;
  tipo: "entrada" | "saida";
  dono: Dono;
  descricao: string;
  valor: number;
  categoria: Categoria;
  data: string; // YYYY-MM-DD
};

export type Estado = {
  nomes: { a: string; b: string };
  transacoes: Transacao[];
};

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

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function parseValor(texto: string): number {
  const t = texto.trim();
  const normalizado = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : NaN;
}

export function hoje(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export type Resumo = {
  entradas: number;
  saidas: number;
  saldo: number;
  gasto: Record<Categoria, number>;
  limite: Record<Categoria, number>;
};

export function resumir(transacoes: Transacao[], visao: Dono, mes: string): Resumo {
  const doMes = transacoes.filter(
    (t) => t.data.startsWith(mes) && (visao === "casal" || t.dono === visao),
  );
  const entradas = soma(doMes.filter((t) => t.tipo === "entrada"));
  const saidas = doMes.filter((t) => t.tipo === "saida");
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

const soma = (ts: Transacao[]) => ts.reduce((acc, t) => acc + t.valor, 0);

export type Parecer = { nivel: "ok" | "atencao" | "nao"; texto: string };

export function podeComprar(
  r: Resumo,
  categoria: Categoria,
  valor: number,
  parcelas: number,
): Parecer {
  if (r.entradas <= 0) {
    return { nivel: "atencao", texto: "Cadastre uma entrada neste mês para calcular seus limites." };
  }
  const parcela = valor / parcelas;
  const livre = r.limite[categoria] - r.gasto[categoria];
  const sobra = livre - parcela;
  const nome = ROTULO[categoria];
  if (r.saldo - parcela < 0) {
    return { nivel: "nao", texto: `Não recomendado: ${brl(parcela)} deste mês é maior que seu saldo de ${brl(r.saldo)}.` };
  }
  if (sobra < 0) {
    return { nivel: "nao", texto: `Não recomendado: estoura o limite de ${nome} em ${brl(-sobra)} (livre: ${brl(livre)}).` };
  }
  if (r.limite[categoria] > 0 && sobra / r.limite[categoria] < 0.2) {
    return { nivel: "atencao", texto: `Atenção: cabe, mas deixa só ${brl(sobra)} livres em ${nome} neste mês.` };
  }
  return { nivel: "ok", texto: `Pode comprar: sobram ${brl(sobra)} em ${nome} neste mês.` };
}
