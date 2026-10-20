"use client";

import { useState } from "react";
import { BANCOS_COMUNS, brl, type Conta } from "@/lib/finance";

const dataBR = (d: string) => d.split("-").reverse().join("/");
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
  adiantada: "bg-primary/15 text-foreground",
};
const rotuloTipo = { pessoal: "👤 Pessoal", casal: "👥 Casal", fixa: "🔁 Renda fixa", parcela: "🧾 Parcela", adiantada: "⏩ Adiantada" };

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

/** Uma linha de banco: saldo, dados do cartão de crédito (fechamento e vencimento) e fatura em aberto. */
function LinhaConta({
  conta,
  saldo,
  fatura,
  dono,
  editavel,
  onExcluir,
  onDefinirCartao,
}: {
  conta: Conta;
  saldo: number;
  fatura?: { vence: string; total: number };
  dono: string | null;
  editavel: boolean;
  onExcluir: () => void;
  onDefinirCartao: (id: string, fechamento: number | null, vencimento: number | null) => Promise<string | null>;
}) {
  const [editando, setEditando] = useState(false);
  const [fecha, setFecha] = useState(String(conta.dia_fechamento ?? ""));
  const [vence, setVence] = useState(String(conta.dia_vencimento ?? ""));
  const [erro, setErro] = useState("");
  const cartao = Boolean(conta.dia_fechamento && conta.dia_vencimento);

  async function salvar(remover: boolean) {
    const f = Math.floor(Number(fecha));
    const v = Math.floor(Number(vence));
    if (!remover && !(f >= 1 && f <= 28 && v >= 1 && v <= 28)) return setErro("Informe dias entre 1 e 28.");
    const falha = await onDefinirCartao(conta.id, remover ? null : f, remover ? null : v);
    if (falha) return setErro(falha);
    setErro("");
    setEditando(false);
  }

  return (
    <li className="py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: conta.cor }} />
          <span className="min-w-0 break-words font-medium">{conta.nome}</span>
          {dono && <span className="text-xs text-subtle">· {dono}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={saldo < 0 ? "text-danger" : ""}>{brl(saldo)}</span>
          {editavel && (
            <button type="button" aria-label={`Excluir ${conta.nome}`} onClick={onExcluir} className="rounded-full px-2 text-subtle hover:text-danger">
              ✕
            </button>
          )}
        </div>
      </div>

      {cartao && (
        <p className="mt-1 text-xs text-subtle">
          💳 Fecha dia {conta.dia_fechamento} · vence dia {conta.dia_vencimento}
          {fatura && (
            <>
              {" "}
              · fatura de {dataBR(fatura.vence)}: <strong className="text-foreground">{brl(fatura.total)}</strong>
            </>
          )}
        </p>
      )}

      {editavel && !editando && (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="mt-2 rounded-full border border-line px-3 py-1 text-xs text-subtle"
        >
          {cartao ? "💳 Editar cartão" : "💳 É cartão de crédito? Definir fechamento e vencimento"}
        </button>
      )}
      {editavel && editando && (
        <div className="animar-entrada mt-2 space-y-2 rounded-lg bg-muted p-3">
          <p className="text-xs text-subtle">
            Compras a prazo neste cartão usam estas datas, mesmo as do casal. Compras a partir do dia do fechamento caem na fatura seguinte.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-subtle">
              Dia do fechamento
              <input
                className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
                type="number"
                min={1}
                max={28}
                inputMode="numeric"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </label>
            <label className="text-xs text-subtle">
              Dia do vencimento
              <input
                className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
                type="number"
                min={1}
                max={28}
                inputMode="numeric"
                value={vence}
                onChange={(e) => setVence(e.target.value)}
              />
            </label>
          </div>
          {erro && <p className="text-xs text-danger">{erro}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => salvar(false)} className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-on-primary">
              Salvar
            </button>
            {cartao && (
              <button type="button" onClick={() => salvar(true)} className="rounded-full border border-line px-4 py-1.5 text-xs text-subtle">
                Não é cartão
              </button>
            )}
            <button type="button" onClick={() => setEditando(false)} className="rounded-full px-3 py-1.5 text-xs text-subtle">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </li>
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
  faturas,
  onDefinirCartao,
}: {
  titulo: string;
  contas: Conta[];
  saldos: Map<string, number>;
  faturas: Map<string, { vence: string; total: number }>;
  onDefinirCartao: (id: string, fechamento: number | null, vencimento: number | null) => Promise<string | null>;
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
        {contas.map((c) => (
          <LinhaConta
            key={c.id}
            conta={c}
            saldo={saldos.get(c.id) ?? 0}
            fatura={faturas.get(c.id)}
            dono={mostrarDono ? nomeDe(c.autor_email) : null}
            editavel={podeEditar && c.autor_email === meuEmail}
            onExcluir={() => onExcluir(c.id)}
            onDefinirCartao={onDefinirCartao}
          />
        ))}
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
