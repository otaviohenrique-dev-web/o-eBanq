"use client";

import {
  brl,
  CATEGORIAS,
  dividirGastos,
  noMes,
  REGRA,
  resumir,
  ROTULO,
  ultimosMeses,
  type Pessoa,
  type Resumo,
  type Transacao,
} from "@/lib/finance";
import { BarrasMeses, BarrasPessoas, Rosca } from "./Charts";

const painel = "rounded-2xl bg-surface p-5 shadow-sm";
const botaoPrimario = "rounded-full bg-primary px-6 py-3 font-medium text-on-primary";
const botaoSecundario = "rounded-full border border-strong px-6 py-3 font-medium text-strong";

type Acoes = { onNovo: () => void; onComprar: () => void };

function Cartoes({ itens }: { itens: { titulo: string; valor: number; cor?: string }[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map((c) => (
        <div key={c.titulo} className={`${painel} animar-entrada`}>
          <p className="text-sm text-subtle">{c.titulo}</p>
          <p className={`mt-2 text-2xl font-semibold ${c.cor ?? ""}`}>{brl(c.valor)}</p>
        </div>
      ))}
    </section>
  );
}

function Limites({ r }: { r: Resumo }) {
  return (
    <section className={painel}>
      <h2 className="font-semibold">Limites do mês (50/30/20)</h2>
      {r.entradas <= 0 && <p className="mt-2 text-sm text-subtle">Cadastre uma entrada para calcular os limites.</p>}
      <div className="mt-4 space-y-4">
        {CATEGORIAS.map((c) => {
          const pct = r.limite[c] > 0 ? (r.gasto[c] / r.limite[c]) * 100 : 0;
          return (
            <div key={c}>
              <div className="flex justify-between text-sm">
                <span>
                  {ROTULO[c]} ({REGRA[c] * 100}%)
                </span>
                <span>
                  {brl(r.gasto[c])} de {brl(r.limite[c])}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full transition-[width] duration-500 ${pct > 100 ? "bg-danger" : pct > 80 ? "bg-warning" : "bg-primary"}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Movimentos({
  titulo,
  lista,
  nomeDe,
  meuEmail,
  onExcluir,
}: {
  titulo: string;
  lista: Transacao[];
  nomeDe: (email: string) => string;
  meuEmail: string;
  onExcluir?: (id: string) => void;
}) {
  const ordenada = [...lista].sort((x, y) => y.data.localeCompare(x.data));
  return (
    <section className={painel}>
      <h2 className="font-semibold">{titulo}</h2>
      {ordenada.length === 0 && <p className="mt-2 text-sm text-subtle">Nada cadastrado ainda.</p>}
      <ul className="mt-2 divide-y divide-line">
        {ordenada.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium">{t.descricao}</p>
              <p className="text-xs text-subtle">
                {t.data.split("-").reverse().join("/")} · {nomeDe(t.autor_email)}
                {t.tipo === "saida" && ` · ${ROTULO[t.categoria]}`}
                {t.escopo === "casal" && " · casal"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={t.tipo === "entrada" ? "text-primary" : "text-danger"}>
                {t.tipo === "entrada" ? "+" : "-"}
                {brl(t.valor)}
              </span>
              {onExcluir && t.autor_email === meuEmail && (
                <button type="button" aria-label={`Excluir ${t.descricao}`} onClick={() => onExcluir(t.id)} className="rounded-full px-2 text-subtle hover:text-danger">
                  ✕
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Meu painel" (editável) e "Par" (somente leitura): só gastos pessoais de uma pessoa. */
export function PainelPessoal({
  transacoes,
  pessoa,
  eu,
  mes,
  somenteLeitura,
  nomeDe,
  onExcluir,
  ...acoes
}: {
  transacoes: Transacao[];
  pessoa: Pessoa;
  eu: Pessoa;
  mes: string;
  somenteLeitura: boolean;
  nomeDe: (email: string) => string;
  onExcluir: (id: string) => void;
} & Acoes) {
  const doMes = noMes(transacoes, mes).filter((t) => t.autor_email === pessoa.email && t.escopo === "pessoal");
  const r = resumir(doMes);
  return (
    <div className="space-y-8">
      {somenteLeitura && (
        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-subtle">
          Você está vendo o painel de <strong className="text-foreground">{pessoa.nome}</strong> (somente leitura).
        </p>
      )}
      <Cartoes
        itens={[
          { titulo: "Disponível para gastar", valor: r.saldo, cor: r.saldo < 0 ? "text-danger" : "text-primary" },
          { titulo: "Reservado / Guardado", valor: r.gasto.economia },
          { titulo: "Entradas do mês", valor: r.entradas },
          { titulo: "Gastos do mês", valor: r.gasto.necessidade + r.gasto.lazer },
        ]}
      />
      {!somenteLeitura && (
        <section className="flex flex-wrap gap-3">
          <button type="button" onClick={acoes.onNovo} className={botaoPrimario}>
            + Cadastrar
          </button>
          <button type="button" onClick={acoes.onComprar} className={botaoSecundario}>
            🔍 Posso Comprar?
          </button>
        </section>
      )}
      <Limites r={r} />
      <Movimentos
        titulo="Movimentações do mês"
        lista={doMes}
        nomeDe={nomeDe}
        meuEmail={eu.email}
        onExcluir={somenteLeitura ? undefined : onExcluir}
      />
    </div>
  );
}

/** Dashboard do casal: junta os dois painéis e acrescenta comparativos e divisão de gastos. */
export function PainelCasal({
  transacoes,
  eu,
  par,
  mes,
  nomeDe,
  onExcluir,
  ...acoes
}: {
  transacoes: Transacao[];
  eu: Pessoa;
  par?: Pessoa;
  mes: string;
  nomeDe: (email: string) => string;
  onExcluir: (id: string) => void;
} & Acoes) {
  const doMes = noMes(transacoes, mes);
  const r = resumir(doMes);
  const historico = ultimosMeses(6).map((m) => {
    const rm = resumir(noMes(transacoes, m));
    return { mes: m, entradas: rm.entradas, saidas: rm.saidas };
  });
  const pessoas = par ? [eu, par] : [eu];
  const porPessoa = pessoas.map((p) => {
    const rp = resumir(doMes.filter((t) => t.autor_email === p.email));
    return { nome: p.nome, entradas: rp.entradas, saidas: rp.saidas };
  });
  const divisao = par ? dividirGastos(doMes, [eu, par]) : null;
  const taxaEconomia = r.entradas > 0 ? Math.round((r.gasto.economia / r.entradas) * 100) : 0;

  return (
    <div className="space-y-8">
      <Cartoes
        itens={[
          { titulo: "Saldo do casal", valor: r.saldo, cor: r.saldo < 0 ? "text-danger" : "text-primary" },
          { titulo: "Entradas combinadas", valor: r.entradas },
          { titulo: "Saídas combinadas", valor: r.saidas },
          { titulo: `Reservado (${taxaEconomia}% da renda)`, valor: r.gasto.economia },
        ]}
      />
      <section className="flex flex-wrap gap-3">
        <button type="button" onClick={acoes.onNovo} className={botaoPrimario}>
          + Cadastrar
        </button>
        <button type="button" onClick={acoes.onComprar} className={botaoSecundario}>
          🔍 Posso Comprar?
        </button>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={painel}>
          <h2 className="mb-4 font-semibold">Para onde foi o dinheiro</h2>
          <Rosca gasto={r.gasto} />
        </section>
        <section className={painel}>
          <h2 className="mb-4 font-semibold">Últimos 6 meses</h2>
          <BarrasMeses dados={historico} />
        </section>
        <section className={painel}>
          <h2 className="mb-4 font-semibold">Contribuição de cada um</h2>
          <BarrasPessoas dados={porPessoa} />
        </section>
        <section className={painel}>
          <h2 className="font-semibold">Divisão dos gastos do casal</h2>
          {!divisao ? (
            <p className="mt-2 text-sm text-subtle">Autorize o e-mail do seu par para dividir os gastos.</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <p className="text-subtle">
                Gastos do casal no mês: <strong className="text-foreground">{brl(divisao.totalCasal)}</strong>, divididos pela proporção da renda de cada um.
              </p>
              {divisao.partes.map((p) => (
                <div key={p.pessoa.email} className="flex justify-between">
                  <span>{p.pessoa.nome}</span>
                  <span>
                    deveria {brl(p.devido)} · pagou {brl(p.pago)}
                  </span>
                </div>
              ))}
              <p className="rounded-lg bg-muted px-3 py-2">
                {divisao.acerto ? (
                  <>
                    <strong>{divisao.acerto.de.nome}</strong> repassa <strong>{brl(divisao.acerto.valor)}</strong> para <strong>{divisao.acerto.para.nome}</strong>.
                  </>
                ) : (
                  "Tudo certo, ninguém deve nada."
                )}
              </p>
            </div>
          )}
        </section>
      </div>

      <Limites r={r} />
      <Movimentos
        titulo="Movimentações do casal no mês"
        lista={doMes}
        nomeDe={nomeDe}
        meuEmail={eu.email}
        onExcluir={onExcluir}
      />
    </div>
  );
}
