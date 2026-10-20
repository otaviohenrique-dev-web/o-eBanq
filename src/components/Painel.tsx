"use client";

import { useState } from "react";
import {
  brl,
  hoje,
  parseValor,
  podeComprar,
  resumir,
  REGRA,
  ROTULO,
  type Categoria,
  type Dono,
  type Parecer,
} from "@/lib/finance";
import { atualizar, useEstado } from "@/lib/store";

const CATEGORIAS = Object.keys(REGRA) as Categoria[];
const campo = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2";

export default function Painel() {
  const estado = useEstado();
  const [visao, setVisao] = useState<Dono>("a");
  const [modal, setModal] = useState<"gasto" | "compra" | null>(null);

  const mes = hoje().slice(0, 7);
  const r = resumir(estado.transacoes, visao, mes);
  const lista = estado.transacoes
    .filter((t) => t.data.startsWith(mes) && (visao === "casal" || t.dono === visao))
    .sort((x, y) => y.data.localeCompare(x.data));

  const abas: { id: Dono; nome: string }[] = [
    { id: "a", nome: estado.nomes.a },
    { id: "b", nome: estado.nomes.b },
    { id: "casal", nome: "Casal" },
  ];
  const nomeDono = (d: Dono) => (d === "casal" ? "Casal" : estado.nomes[d]);

  const cartoes = [
    { titulo: "Disponível para gastar", valor: r.saldo, cor: r.saldo < 0 ? "text-danger" : "text-primary" },
    { titulo: "Reservado / Guardado", valor: r.gasto.economia, cor: "text-navy" },
    { titulo: "Entradas do mês", valor: r.entradas, cor: "text-navy" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-navy px-6 py-4 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">o&amp;eBanq</h1>
          <nav className="flex gap-1 rounded-full bg-navy-soft p-1 text-sm">
            {abas.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setVisao(a.id)}
                className={`rounded-full px-4 py-1.5 ${
                  visao === a.id ? "bg-primary font-medium text-navy" : "text-slate-300"
                }`}
              >
                {a.nome}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-6 py-8">
        <section className="grid gap-4 sm:grid-cols-3">
          {cartoes.map((c) => (
            <div key={c.titulo} className="rounded-2xl bg-surface p-5 shadow-sm">
              <p className="text-sm text-slate-500">{c.titulo}</p>
              <p className={`mt-2 text-2xl font-semibold ${c.cor}`}>{brl(c.valor)}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setModal("gasto")} className="rounded-full bg-primary px-6 py-3 font-medium text-navy">
            + Cadastrar
          </button>
          <button type="button" onClick={() => setModal("compra")} className="rounded-full border border-navy px-6 py-3 font-medium text-navy">
            🔍 Posso Comprar?
          </button>
        </section>

        <section className="rounded-2xl bg-surface p-5 shadow-sm">
          <h2 className="font-semibold">Limites do mês (50/30/20)</h2>
          {r.entradas <= 0 && (
            <p className="mt-2 text-sm text-slate-500">Cadastre uma entrada para calcular seus limites.</p>
          )}
          <div className="mt-4 space-y-4">
            {CATEGORIAS.map((c) => {
              const pct = r.limite[c] > 0 ? (r.gasto[c] / r.limite[c]) * 100 : 0;
              return (
                <div key={c}>
                  <div className="flex justify-between text-sm">
                    <span>{ROTULO[c]} ({REGRA[c] * 100}%)</span>
                    <span>{brl(r.gasto[c])} de {brl(r.limite[c])}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${pct > 100 ? "bg-danger" : pct > 80 ? "bg-warning" : "bg-primary"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-surface p-5 shadow-sm">
          <h2 className="font-semibold">Movimentações do mês</h2>
          {lista.length === 0 && <p className="mt-2 text-sm text-slate-500">Nada cadastrado ainda.</p>}
          <ul className="mt-2 divide-y divide-slate-100">
            {lista.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{t.descricao}</p>
                  <p className="text-xs text-slate-500">
                    {t.data.split("-").reverse().join("/")} · {nomeDono(t.dono)}
                    {t.tipo === "saida" && ` · ${ROTULO[t.categoria]}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={t.tipo === "entrada" ? "text-primary" : "text-danger"}>
                    {t.tipo === "entrada" ? "+" : "-"}{brl(t.valor)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Excluir ${t.descricao}`}
                    onClick={() => atualizar((e) => ({ ...e, transacoes: e.transacoes.filter((x) => x.id !== t.id) }))}
                    className="text-slate-400 hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-surface p-5 shadow-sm">
          <h2 className="font-semibold">Nomes</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(["a", "b"] as const).map((k) => (
              <input
                key={k}
                aria-label={`Nome da pessoa ${k === "a" ? 1 : 2}`}
                className={campo}
                value={estado.nomes[k]}
                onChange={(ev) => atualizar((e) => ({ ...e, nomes: { ...e.nomes, [k]: ev.target.value } }))}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Os dados ficam salvos só neste navegador.</p>
        </section>
      </main>

      {modal === "gasto" && <FormLancamento visao={visao} nomes={estado.nomes} onFechar={() => setModal(null)} />}
      {modal === "compra" && <FormCompra resumo={r} onFechar={() => setModal(null)} />}
    </div>
  );
}

function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button type="button" aria-label="Fechar" onClick={onFechar} className="text-slate-400">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormLancamento({ visao, nomes, onFechar }: { visao: Dono; nomes: { a: string; b: string }; onFechar: () => void }) {
  const [tipo, setTipo] = useState<"entrada" | "saida">("saida");
  const [dono, setDono] = useState<Dono>(visao);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("necessidade");
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState("");

  function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const v = parseValor(valor);
    if (!descricao.trim()) return setErro("Informe uma descrição.");
    if (!(v > 0)) return setErro("Informe um valor maior que zero.");
    if (!data) return setErro("Informe a data.");
    atualizar((e) => ({
      ...e,
      transacoes: [...e.transacoes, { id: crypto.randomUUID(), tipo, dono, descricao: descricao.trim(), valor: v, categoria, data }],
    }));
    onFechar();
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
              className={`flex-1 rounded-lg border px-3 py-2 ${tipo === t ? "border-navy bg-navy text-white" : "border-slate-300"}`}
            >
              {t === "saida" ? "Gasto" : "Entrada"}
            </button>
          ))}
        </div>
        <input className={campo} placeholder="Descrição (ex: Mercado)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <input className={campo} placeholder="Valor (ex: 150,00)" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
        <select className={campo} value={dono} onChange={(e) => setDono(e.target.value as Dono)} aria-label="De quem">
          <option value="a">{nomes.a}</option>
          <option value="b">{nomes.b}</option>
          <option value="casal">Casal</option>
        </select>
        {tipo === "saida" && (
          <select className={campo} value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} aria-label="Categoria">
            {CATEGORIAS.map((c) => <option key={c} value={c}>{ROTULO[c]}</option>)}
          </select>
        )}
        <input className={campo} type="date" value={data} onChange={(e) => setData(e.target.value)} aria-label="Data" />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button type="submit" className="w-full rounded-full bg-primary px-6 py-3 font-medium text-navy">Salvar</button>
      </form>
    </Modal>
  );
}

function FormCompra({ resumo, onFechar }: { resumo: ReturnType<typeof resumir>; onFechar: () => void }) {
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

  const cor = { ok: "bg-primary/15 text-emerald-800", atencao: "bg-warning/20 text-amber-800", nao: "bg-danger/15 text-red-800" };

  return (
    <Modal titulo="Posso comprar?" onFechar={onFechar}>
      <form onSubmit={analisar} className="space-y-3">
        <input className={campo} placeholder="Valor total (ex: 1200,00)" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
        <input className={campo} type="number" min={1} placeholder="Parcelas" value={parcelas} onChange={(e) => setParcelas(e.target.value)} aria-label="Parcelas" />
        <select className={campo} value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} aria-label="Categoria">
          {CATEGORIAS.map((c) => <option key={c} value={c}>{ROTULO[c]}</option>)}
        </select>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button type="submit" className="w-full rounded-full bg-primary px-6 py-3 font-medium text-navy">Analisar</button>
      </form>
      {parecer && <p className={`mt-4 rounded-lg p-3 text-sm ${cor[parecer.nivel]}`}>{parecer.texto}</p>}
      <p className="mt-3 text-xs text-slate-500">Análise sobre a visão selecionada no mês atual.</p>
    </Modal>
  );
}
