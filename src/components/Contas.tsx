"use client";

import { useState } from "react";
import { BANCOS_COMUNS, brl, type Conta } from "@/lib/finance";
import { Dica } from "./Ajuda";
import { CampoValor } from "./CampoValor";

/** Etiqueta colorida com o nome do banco. */
export function ChipConta({ conta }: { conta?: Conta }) {
  if (!conta) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
      <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: conta.cor }} />
      {conta.nome}
    </span>
  );
}

const estiloTipo = {
  pessoal: "bg-serie-1/15 text-foreground",
  casal: "bg-serie-2/20 text-foreground",
  fixa: "bg-primary/15 text-foreground",
  parcela: "bg-warning/20 text-foreground",
};
const rotuloTipo = { pessoal: "👤 Pessoal", casal: "👥 Casal", fixa: "🔁 Renda fixa", parcela: "🧾 Parcela" };

/** Etiqueta que deixa claro se o lançamento é pessoal, do casal, renda fixa ou parcela. */
export function ChipTipo({ tipo }: { tipo: keyof typeof estiloTipo }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${estiloTipo[tipo]}`}>{rotuloTipo[tipo]}</span>;
}

/** Escolha do banco em formato de etiquetas (mais fácil de tocar no celular que um menu). */
export function SeletorConta({
  contas,
  valor,
  onChange,
}: {
  contas: Conta[];
  valor: string | null;
  onChange: (id: string | null) => void;
}) {
  if (contas.length === 0) {
    return <p className="text-xs text-subtle">Dica: cadastre seus bancos em &ldquo;Meus bancos&rdquo; para marcar de onde vem ou para onde vai cada valor.</p>;
  }
  const chip = (ativo: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${ativo ? "border-strong bg-strong text-background" : "border-line"}`;
  return (
    <div>
      <p className="mb-1.5 text-sm text-subtle">Banco / conta</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Banco ou conta">
        {contas.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={valor === c.id} onClick={() => onChange(c.id)} className={chip(valor === c.id)}>
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.cor }} />
            {c.nome}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={valor === null} onClick={() => onChange(null)} className={chip(valor === null)}>
          Sem banco
        </button>
      </div>
    </div>
  );
}

/** Lista os bancos com o saldo atual de cada um e permite adicionar ou remover (só os próprios). */
export function ContasPanel({
  titulo,
  contas,
  saldos,
  meuEmail,
  nomeDe,
  podeEditar,
  mostrarDono,
  onAdicionar,
  onExcluir,
}: {
  titulo: string;
  contas: Conta[];
  saldos: Map<string, number>;
  meuEmail: string;
  nomeDe: (email: string) => string;
  podeEditar: boolean;
  mostrarDono: boolean;
  onAdicionar: (nome: string, saldoInicial: number) => Promise<string | null>;
  onExcluir: (id: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [saldo, setSaldo] = useState("");
  const [erro, setErro] = useState("");
  const total = contas.reduce((s, c) => s + (saldos.get(c.id) ?? 0), 0);
  const jaTem = new Set(contas.filter((c) => c.autor_email === meuEmail).map((c) => c.nome.toLowerCase()));

  async function adicionar(n: string, valorTexto: string) {
    const nomeLimpo = n.trim();
    if (!nomeLimpo) return setErro("Informe o nome do banco.");
    const texto = valorTexto.trim();
    const v = texto === "" ? 0 : Number(texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto);
    if (!Number.isFinite(v)) return setErro("Saldo inicial inválido.");
    const falha = await onAdicionar(nomeLimpo, v);
    if (falha) return setErro(falha);
    setErro("");
    setNome("");
    setSaldo("");
  }

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{titulo}</h2>
        <Dica>
          <p>Cada banco é uma etiqueta: ao cadastrar entradas, gastos, salário ou compras a prazo você marca em qual banco o valor está.</p>
          <p>O saldo de cada banco é o saldo inicial que você informar mais as entradas menos as saídas marcadas nele, até hoje.</p>
        </Dica>
      </div>

      {contas.length === 0 && <p className="mt-3 text-sm text-subtle">Nenhum banco cadastrado ainda.</p>}
      <ul className="mt-2 divide-y divide-line">
        {contas.map((c) => {
          const s = saldos.get(c.id) ?? 0;
          return (
            <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: c.cor }} />
                <span className="min-w-0 break-words font-medium">{c.nome}</span>
                {mostrarDono && <span className="text-xs text-subtle">· {nomeDe(c.autor_email)}</span>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={s < 0 ? "text-danger" : ""}>{brl(s)}</span>
                {podeEditar && c.autor_email === meuEmail && (
                  <button type="button" aria-label={`Excluir ${c.nome}`} onClick={() => onExcluir(c.id)} className="rounded-full px-2 text-subtle hover:text-danger">
                    ✕
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {contas.length > 1 && (
        <p className="mt-2 flex justify-between border-t border-line pt-3 text-sm">
          <span className="text-subtle">Total em todos os bancos</span>
          <strong>{brl(total)}</strong>
        </p>
      )}

      {podeEditar && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-subtle">Adicionar com um toque:</p>
          <div className="flex flex-wrap gap-2">
            {BANCOS_COMUNS.filter((b) => !jaTem.has(b.toLowerCase())).map((b) => (
              <button key={b} type="button" onClick={() => adicionar(b, "")} className="rounded-full border border-line px-3 py-1 text-xs text-subtle">
                + {b}
              </button>
            ))}
          </div>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(ev) => {
              ev.preventDefault();
              adicionar(nome, saldo);
            }}
          >
            <input
              className="w-full flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm"
              placeholder="Outro banco ou conta"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-label="Nome do banco"
              maxLength={40}
            />
            <CampoValor className="w-full sm:w-44" rotulo="Saldo inicial" placeholder="Saldo hoje (opcional)" valor={saldo} onChange={setSaldo} />
            <button type="submit" className="rounded-full border border-strong px-5 py-2 text-sm font-medium text-strong">
              Adicionar
            </button>
          </form>
          {erro && <p className="text-sm text-danger">{erro}</p>}
        </div>
      )}
    </section>
  );
}
