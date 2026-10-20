"use client";

import { useState } from "react";
import {
  CATEGORIAS,
  hoje,
  parseValor,
  ROTULO,
  type Categoria,
  type Conta,
  type Escopo,
  type Transacao,
} from "@/lib/finance";
import { SeletorConta } from "./Contas";

export const campo = "w-full rounded-lg border border-line bg-background px-3 py-2";
const botaoPrimario = "w-full rounded-full bg-primary px-6 py-3 font-medium text-on-primary";

const DICA_CATEGORIA: Record<Categoria, string> = {
  necessidade: "Necessidades: aluguel, contas, mercado, transporte, dívidas fixas.",
  lazer: "Lazer: saídas, hobbies, streaming, compras pessoais.",
  economia: "Economias: o que você guardou ou investiu. Conta como Reservado.",
};

export type NovaTransacao = Omit<Transacao, "id" | "autor_email">;

export function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onFechar}
    >
      <div className="animar-entrada max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
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
  contas,
  onSalvar,
  onFechar,
}: {
  escopoInicial: Escopo;
  contas: Conta[];
  onSalvar: (t: NovaTransacao) => Promise<string | null>;
  onFechar: () => void;
}) {
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida");
  const [escopo, setEscopo] = useState<Escopo>(escopoInicial);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("necessidade");
  const [data, setData] = useState(hoje);
  const [contaId, setContaId] = useState<string | null>(contas.length === 1 ? contas[0].id : null);
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
      conta_id: contaId,
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
        <p className="text-xs text-subtle">
          {tipo === "entrada"
            ? "Entrada é dinheiro que chegou: salário, renda extra, reembolso. É sempre pessoal e define seus limites do mês."
            : "Gasto é dinheiro que saiu. Escolha abaixo se é só seu ou do casal, e a categoria."}
        </p>
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
            <p className="text-xs text-subtle">
              {escopo === "casal"
                ? "👥 Gasto do casal: aparece só na visão Casal e é dividido pela renda de cada um. "
                : "👤 Gasto pessoal: aparece no seu painel (Meu painel) e também soma no Casal. "}
              {DICA_CATEGORIA[categoria]}
            </p>
          </>
        )}
        <SeletorConta contas={contas} valor={contaId} onChange={setContaId} />
        <input className={campo} type="date" value={data} onChange={(e) => setData(e.target.value)} aria-label="Data" />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button type="submit" disabled={salvando} className={botaoPrimario}>
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </Modal>
  );
}

