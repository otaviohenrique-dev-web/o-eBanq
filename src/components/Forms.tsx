"use client";

import { useState } from "react";
import {
  CATEGORIAS,
  hoje,
  parseValor,
  podeComprar,
  ROTULO,
  type Categoria,
  type Escopo,
  type Parecer,
  type Resumo,
  type Transacao,
} from "@/lib/finance";

export const campo = "w-full rounded-lg border border-line bg-background px-3 py-2";
const botaoPrimario = "w-full rounded-full bg-primary px-6 py-3 font-medium text-on-primary";

export type NovaTransacao = Omit<Transacao, "id" | "autor_email">;

export function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onFechar}
    >
      <div className="animar-entrada w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button type="button" aria-label="Fechar" onClick={onFechar} className="rounded-full px-2 text-subtle">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormLancamento({
  escopoInicial,
  onSalvar,
  onFechar,
}: {
  escopoInicial: Escopo;
  onSalvar: (t: NovaTransacao) => Promise<string | null>;
  onFechar: () => void;
}) {
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida");
  const [escopo, setEscopo] = useState<Escopo>(escopoInicial);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("necessidade");
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const v = parseValor(valor);
    if (!descricao.trim()) return setErro("Informe uma descrição.");
    if (!(v > 0)) return setErro("Informe um valor maior que zero.");
    if (!data) return setErro("Informe a data.");
    setSalvando(true);
    const falha = await onSalvar({
      tipo,
      escopo: tipo === "entrada" ? "pessoal" : escopo,
      descricao: descricao.trim(),
      valor: v,
      categoria,
      data,
    });
    setSalvando(false);
    if (falha) setErro(falha);
    else onFechar();
  }

  return (
    <Modal titulo="Novo lançamento" onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-3">
        <div className="flex gap-2">
          {(["saida", "entrada"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`flex-1 rounded-lg border px-3 py-2 ${tipo === t ? "border-strong bg-strong text-background" : "border-line"}`}
            >
              {t === "saida" ? "Gasto" : "Entrada"}
            </button>
          ))}
        </div>
        <input className={campo} placeholder="Descrição (ex: Mercado)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <input className={campo} placeholder="Valor (ex: 150,00)" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
        {tipo === "saida" && (
          <>
            <select className={campo} value={escopo} onChange={(e) => setEscopo(e.target.value as Escopo)} aria-label="Tipo de gasto">
              <option value="pessoal">Gasto pessoal</option>
              <option value="casal">Gasto do casal (dividido)</option>
            </select>
            <select className={campo} value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} aria-label="Categoria">
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {ROTULO[c]}
                </option>
              ))}
            </select>
          </>
        )}
        <input className={campo} type="date" value={data} onChange={(e) => setData(e.target.value)} aria-label="Data" />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button type="submit" disabled={salvando} className={botaoPrimario}>
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </Modal>
  );
}

export function FormCompra({ resumo, rotuloVisao, onFechar }: { resumo: Resumo; rotuloVisao: string; onFechar: () => void }) {
  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [categoria, setCategoria] = useState<Categoria>("lazer");
  const [parecer, setParecer] = useState<Parecer | null>(null);
  const [erro, setErro] = useState("");

  function analisar(ev: React.FormEvent) {
    ev.preventDefault();
    const v = parseValor(valor);
    const p = Math.floor(Number(parcelas));
    if (!(v > 0)) return setErro("Informe um valor maior que zero.");
    if (!(p >= 1)) return setErro("Informe ao menos 1 parcela.");
    setErro("");
    setParecer(podeComprar(resumo, categoria, v, p));
  }

  const cor = {
    ok: "bg-primary/15 text-foreground",
    atencao: "bg-warning/20 text-foreground",
    nao: "bg-danger/15 text-foreground",
  };

  return (
    <Modal titulo="Posso comprar?" onFechar={onFechar}>
      <form onSubmit={analisar} className="space-y-3">
        <input className={campo} placeholder="Valor total (ex: 1200,00)" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
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
      </form>
      {parecer && <p className={`animar-entrada mt-4 rounded-lg p-3 text-sm ${cor[parecer.nivel]}`}>{parecer.texto}</p>}
      <p className="mt-3 text-xs text-subtle">Análise sobre: {rotuloVisao}, mês atual.</p>
    </Modal>
  );
}
