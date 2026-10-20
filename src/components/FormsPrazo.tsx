"use client";

import { useState } from "react";
import {
  brl,
  CATEGORIAS,
  parseValor,
  podeComprar,
  ROTULO,
  type Categoria,
  type Conta,
  type Escopo,
  type Parecer,
  type Resumo,
} from "@/lib/finance";
import { SeletorConta } from "./Contas";
import { CampoValor } from "./CampoValor";
import { campo, Modal, SugestaoCategoria } from "./Forms";

const botaoPrimario = "w-full rounded-full bg-primary px-6 py-3 font-medium text-on-primary";

export function FormCompra({
  resumo,
  rotuloVisao,
  onFechar,
  consultarIA,
}: {
  resumo: Resumo;
  rotuloVisao: string;
  onFechar: () => void;
  consultarIA: (pedido: Record<string, unknown>) => Promise<string>;
}) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [categoria, setCategoria] = useState<Categoria>("lazer");
  const [parecer, setParecer] = useState<Parecer | null>(null);
  const [erro, setErro] = useState("");
  const [ia, setIa] = useState("");
  const [iaErro, setIaErro] = useState("");
  const [iaCarregando, setIaCarregando] = useState(false);

  function validar(): { v: number; p: number } | null {
    const v = parseValor(valor);
    const p = Math.floor(Number(parcelas));
    if (!(v > 0)) {
      setErro("Informe um valor maior que zero.");
      return null;
    }
    if (!(p >= 1)) {
      setErro("Informe ao menos 1 parcela.");
      return null;
    }
    setErro("");
    return { v, p };
  }

  function analisar(ev: React.FormEvent) {
    ev.preventDefault();
    const d = validar();
    if (d) setParecer(podeComprar(resumo, categoria, d.v, d.p));
  }

  async function pedirIA() {
    const d = validar();
    if (!d) return;
    if (!nome.trim()) return setErro("Diga o que você quer comprar para a IA analisar.");
    setIa("");
    setIaErro("");
    setIaCarregando(true);
    try {
      setIa(await consultarIA({ modo: "compra", nome: nome.trim(), valor: d.v, parcelas: d.p, categoria }));
    } catch (e) {
      setIaErro(e instanceof Error ? e.message : "Falha ao consultar a IA.");
    } finally {
      setIaCarregando(false);
    }
  }

  const cor = {
    ok: "bg-primary/15 text-foreground",
    atencao: "bg-warning/20 text-foreground",
    nao: "bg-danger/15 text-foreground",
  };

  return (
    <Modal titulo="Posso comprar?" onFechar={onFechar}>
      <form onSubmit={analisar} className="space-y-3">
        <p className="text-xs text-subtle">
          Confere se a compra cabe no saldo e no limite da categoria. Para a opinião da IA, diga também o que é.
        </p>
        <input className={campo} placeholder="O que é? (ex: Notebook)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <CampoValor rotulo="Valor total" valor={valor} onChange={setValor} />
        <input className={campo} type="number" min={1} placeholder="Parcelas" value={parcelas} onChange={(e) => setParcelas(e.target.value)} aria-label="Parcelas" />
        <select className={campo} value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} aria-label="Categoria">
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {ROTULO[c]}
            </option>
          ))}
        </select>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button type="submit" className={botaoPrimario}>
          Analisar
        </button>
        <button type="button" disabled={iaCarregando} onClick={pedirIA} className="w-full rounded-full border border-strong px-6 py-3 font-medium text-strong">
          {iaCarregando ? "Consultando a IA..." : "🤖 Pedir parecer da IA"}
        </button>
      </form>
      {parecer && <p className={`animar-entrada mt-4 rounded-lg p-3 text-sm ${cor[parecer.nivel]}`}>{parecer.texto}</p>}
      {ia && <p className="animar-entrada mt-3 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{ia}</p>}
      {iaErro && <p className="mt-3 text-sm text-danger">{iaErro}</p>}
      <p className="mt-3 text-xs text-subtle">Análise sobre: {rotuloVisao}, mês selecionado.</p>
    </Modal>
  );
}

export type NovaRenda = { descricao: string; valor: number; dia: number; inicio: string; conta_id: string | null };

export function FormRendaFixa({
  mesAtual,
  contas,
  onSalvar,
  onFechar,
}: {
  mesAtual: string;
  contas: Conta[];
  onSalvar: (r: NovaRenda) => Promise<string | null>;
  onFechar: () => void;
}) {
  const [descricao, setDescricao] = useState("Salário");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState("5");
  const [inicio, setInicio] = useState(mesAtual);
  const [contaId, setContaId] = useState<string | null>(contas.length === 1 ? contas[0].id : null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const v = parseValor(valor);
    const d = Math.floor(Number(dia));
    if (!descricao.trim()) return setErro("Informe um nome (ex: Salário).");
    if (!(v > 0)) return setErro("Informe um valor maior que zero.");
    if (!(d >= 1 && d <= 28)) return setErro("O dia deve ficar entre 1 e 28.");
    if (!/^\d{4}-\d{2}$/.test(inicio)) return setErro("Escolha o mês de início.");
    setSalvando(true);
    const falha = await onSalvar({ descricao: descricao.trim(), valor: v, dia: d, inicio, conta_id: contaId });
    setSalvando(false);
    if (falha) setErro(falha);
    else onFechar();
  }

  return (
    <Modal titulo="Cadastrar salário (renda fixa)" onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-3">
        <p className="text-xs text-subtle">
          Conta automaticamente em todo mês, a partir do mês escolhido, sem precisar lançar de novo. Para dinheiro que cai sem data
          certa (freelas, vendas), use + Cadastrar &gt; Entrada quando ele chegar.
        </p>
        <input className={campo} placeholder="Nome (ex: Salário)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <CampoValor rotulo="Valor mensal" valor={valor} onChange={setValor} />
        <label className="block text-sm text-subtle">
          Dia em que cai (1 a 28)
          <input className={`${campo} mt-1`} type="number" min={1} max={28} value={dia} onChange={(e) => setDia(e.target.value)} />
        </label>
        <label className="block text-sm text-subtle">
          Vale a partir de
          <input className={`${campo} mt-1`} type="month" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </label>
        <SeletorConta contas={contas} valor={contaId} onChange={setContaId} />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button type="submit" disabled={salvando} className={botaoPrimario}>
          {salvando ? "Salvando..." : "Salvar salário"}
        </button>
      </form>
    </Modal>
  );
}

export type NovoParcelamento = {
  descricao: string;
  valor_total: number;
  parcelas: number;
  primeira: string;
  categoria: Categoria;
  escopo: Escopo;
  conta_id: string | null;
};

export function FormParcelamento({
  mesInicial,
  escopoInicial,
  contas,
  onSalvar,
  onFechar,
}: {
  mesInicial: string;
  escopoInicial: Escopo;
  contas: Conta[];
  onSalvar: (p: NovoParcelamento) => Promise<string | null>;
  onFechar: () => void;
}) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState("");
  const [primeira, setPrimeira] = useState(mesInicial);
  const [categoria, setCategoria] = useState<Categoria>("necessidade");
  const [escopo, setEscopo] = useState<Escopo>(escopoInicial);
  const [contaId, setContaId] = useState<string | null>(contas.length === 1 ? contas[0].id : null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const v = parseValor(valor);
  const n = Math.floor(Number(parcelas));
  const previa = v > 0 && n >= 2 ? `${n}x de ${brl(v / n)}` : "";

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!descricao.trim()) return setErro("Informe o que foi comprado.");
    if (!(v > 0)) return setErro("Informe o valor total.");
    if (!(n >= 2 && n <= 120)) return setErro("Informe de 2 a 120 parcelas.");
    if (!/^\d{4}-\d{2}$/.test(primeira)) return setErro("Escolha o mês da primeira parcela.");
    setSalvando(true);
    const falha = await onSalvar({ descricao: descricao.trim(), valor_total: v, parcelas: n, primeira, categoria, escopo, conta_id: contaId });
    setSalvando(false);
    if (falha) setErro(falha);
    else onFechar();
  }

  return (
    <Modal titulo="Nova compra a prazo" onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-3">
        <p className="text-xs text-subtle">
          Informe o valor total e o número de parcelas. O sistema lança uma parcela por mês, a partir do mês escolhido, e soma tudo
          que vence em cada mês.
        </p>
        <input className={campo} placeholder="O que foi comprado? (ex: Geladeira)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <CampoValor rotulo="Valor total" valor={valor} onChange={setValor} />
        <input className={campo} type="number" min={2} max={120} placeholder="Número de parcelas" value={parcelas} onChange={(e) => setParcelas(e.target.value)} aria-label="Número de parcelas" />
        {previa && <p className="text-sm font-medium">{previa}</p>}
        <label className="block text-sm text-subtle">
          Mês da primeira parcela
          <input className={`${campo} mt-1`} type="month" value={primeira} onChange={(e) => setPrimeira(e.target.value)} />
        </label>
        <select className={campo} value={escopo} onChange={(e) => setEscopo(e.target.value as Escopo)} aria-label="De quem">
          <option value="pessoal">Compra pessoal</option>
          <option value="casal">Compra do casal (dividida)</option>
        </select>
        <select className={campo} value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} aria-label="Categoria">
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {ROTULO[c]}
            </option>
          ))}
        </select>
        <SugestaoCategoria descricao={descricao} categoria={categoria} onEscolher={setCategoria} />
        <p className="text-xs text-subtle">
          As parcelas entram como gasto em cada mês em que vencem, na categoria escolhida, e já contam nos limites 50/30/20.
        </p>
        <SeletorConta contas={contas} valor={contaId} onChange={setContaId} />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button type="submit" disabled={salvando} className={botaoPrimario}>
          {salvando ? "Salvando..." : "Salvar compra"}
        </button>
      </form>
    </Modal>
  );
}
