"use client";

import {
  addMeses,
  brl,
  CATEGORIAS,
  difMeses,
  dividirGastos,
  noMes,
  REGRA,
  resumir,
  resumirMes,
  rotuloMes,
  ROTULO,
  ultimosMeses,
  type Parcelamento,
  type Pessoa,
  type RendaFixa,
  type Resumo,
  type Transacao,
} from "@/lib/finance";
import { Dica, PrimeirosPassos } from "./Ajuda";
import Assistente from "./Assistente";
import { BarrasMeses, BarrasParcelas, BarrasPessoas, Rosca } from "./Charts";

const painel = "rounded-2xl bg-surface p-5 shadow-sm";
const botaoPrimario = "rounded-full bg-primary px-6 py-3 font-medium text-on-primary";
const botaoSecundario = "rounded-full border border-strong px-6 py-3 font-medium text-strong";
const botaoPequeno = "rounded-full border border-line px-3 py-1 text-xs text-subtle";

export type Gestao = {
  rendas: RendaFixa[];
  parcelamentos: Parcelamento[];
  consultarIA: (pedido: Record<string, unknown>) => Promise<string>;
  onNovo: () => void;
  onComprar: () => void;
  onNovaRenda: () => void;
  onEncerrarRenda: (id: string) => void;
  onExcluirRenda: (id: string) => void;
  onNovoParcelamento: () => void;
  onExcluirParcelamento: (id: string) => void;
  onExcluir: (id: string) => void;
};

function Cartoes({ itens }: { itens: { titulo: string; valor: number; cor?: string; dica?: string }[] }) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {itens.map((c) => (
        <div key={c.titulo} className="animar-entrada rounded-2xl bg-surface p-4 shadow-sm sm:p-5">
          <p className="text-xs text-subtle sm:text-sm">{c.titulo}</p>
          <p className={`mt-1.5 break-words text-lg font-semibold sm:mt-2 sm:text-2xl ${c.cor ?? ""}`}>{brl(c.valor)}</p>
          {c.dica && <p className="mt-1 text-xs text-subtle">{c.dica}</p>}
        </div>
      ))}
    </section>
  );
}

function Acoes({ g, comprar = true }: { g: Gestao; comprar?: boolean }) {
  return (
    <section className="flex flex-wrap gap-3">
      <button type="button" onClick={g.onNovo} className={botaoPrimario}>
        + Cadastrar
      </button>
      <button type="button" onClick={g.onNovoParcelamento} className={botaoSecundario}>
        + Compra a prazo
      </button>
      {comprar && (
        <button type="button" onClick={g.onComprar} className={botaoSecundario}>
          🔍 Posso Comprar?
        </button>
      )}
    </section>
  );
}

function Limites({ r }: { r: Resumo }) {
  return (
    <section className={painel}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Limites do mês (50/30/20)</h2>
        <Dica>
          <p>A renda é dividida em três tetos: 50% necessidades, 30% lazer e 20% economias.</p>
          <p>A base é a renda fixa mais a renda variável esperada: o maior entre o que já entrou no mês e a média dos 3 meses anteriores.</p>
          <p>A barra fica verde, vira âmbar acima de 80% do limite e vermelha ao estourar. As parcelas do mês entram nos gastos.</p>
        </Dica>
      </div>
      {r.base <= 0 ? (
        <p className="mt-2 text-sm text-subtle">Cadastre seu salário ou uma entrada para calcular os limites.</p>
      ) : (
        <p className="mt-2 text-sm text-subtle">Calculado sobre {brl(r.base)} de renda.</p>
      )}
      <div className="mt-4 space-y-4">
        {CATEGORIAS.map((c) => {
          const pct = r.limite[c] > 0 ? (r.gasto[c] / r.limite[c]) * 100 : 0;
          return (
            <div key={c}>
              <div className="flex flex-wrap justify-between gap-x-3 text-sm">
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

function RendaFixaCard({
  rendas,
  mes,
  r,
  meuEmail,
  nomeDe,
  podeCadastrar,
  g,
}: {
  rendas: RendaFixa[];
  mes: string;
  r: Resumo;
  meuEmail: string;
  nomeDe: (email: string) => string;
  podeCadastrar: boolean;
  g: Gestao;
}) {
  const ativa = (x: RendaFixa) => x.inicio <= mes && (!x.fim || x.fim >= mes);
  return (
    <section className={painel}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Salário e renda</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Dica titulo="Como funciona">
            <p>Salário (renda fixa) é cadastrado uma vez e conta sozinho em todo mês, a partir do mês escolhido.</p>
            <p>Se seu dinheiro entra sem data certa, lance cada entrada em + Cadastrar quando ele chegar. É a renda variável.</p>
            <p>Os limites usam a renda fixa mais o maior entre o recebido no mês e a média dos 3 meses anteriores.</p>
          </Dica>
          {podeCadastrar && (
            <button type="button" onClick={g.onNovaRenda} className={botaoPequeno}>
              + Cadastrar salário
            </button>
          )}
        </div>
      </div>
      {rendas.length === 0 && (
        <p className="mt-3 text-sm text-subtle">Nenhum salário cadastrado. Se você recebe todo mês, cadastre aqui e esqueça de lançar de novo.</p>
      )}
      <ul className="mt-2 divide-y divide-line">
        {rendas.map((x) => (
          <li key={x.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0 break-words">
              <p className="font-medium">
                {x.descricao} · {brl(x.valor)}/mês
              </p>
              <p className="text-xs text-subtle">
                {nomeDe(x.autor_email)} · cai dia {x.dia} · desde {rotuloMes(x.inicio)}
                {x.fim ? ` · encerrada em ${rotuloMes(x.fim)}` : ""}
                {ativa(x) ? " · ativa neste mês" : ""}
              </p>
            </div>
            {x.autor_email === meuEmail && (
              <div className="flex shrink-0 items-center gap-2">
                {!x.fim && (
                  <button type="button" onClick={() => g.onEncerrarRenda(x.id)} className={botaoPequeno} title="Deixa de contar a partir deste mês">
                    Encerrar
                  </button>
                )}
                <button type="button" aria-label={`Excluir ${x.descricao}`} onClick={() => g.onExcluirRenda(x.id)} className="rounded-full px-2 text-subtle hover:text-danger">
                  ✕
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-subtle">
        Renda variável: recebida neste mês <strong className="text-foreground">{brl(r.variavel)}</strong> · média dos 3 meses anteriores{" "}
        <strong className="text-foreground">{brl(r.mediaVariavel)}</strong>
      </p>
    </section>
  );
}

function ParcelasPanel({
  parcelamentos,
  parcelasTs,
  mes,
  r,
  meuEmail,
  nomeDe,
  somenteLeitura,
  g,
}: {
  parcelamentos: Parcelamento[];
  parcelasTs: Transacao[];
  mes: string;
  r: Resumo;
  meuEmail: string;
  nomeDe: (email: string) => string;
  somenteLeitura: boolean;
  g: Gestao;
}) {
  const proximos = Array.from({ length: 6 }, (_, i) => {
    const m = addMeses(mes, i);
    return { mes: m, total: parcelasTs.filter((t) => t.data.startsWith(m)).reduce((s, t) => s + t.valor, 0) };
  });
  const percentual = r.base > 0 ? Math.round((r.parcelas / r.base) * 100) : 0;
  return (
    <section className={painel}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Compras a prazo</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Dica>
            <p>Cadastre o valor total e o número de parcelas: o sistema lança uma parcela por mês e soma tudo que vence em cada mês.</p>
            <p>O ideal é que as parcelas somem até 20% da renda.</p>
          </Dica>
          {!somenteLeitura && (
            <button type="button" onClick={g.onNovoParcelamento} className={botaoPequeno}>
              + Compra a prazo
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm">
        A pagar em {rotuloMes(mes)}: <strong className="text-lg">{brl(r.parcelas)}</strong>
        {r.base > 0 && (
          <span className={percentual > 20 ? "text-danger" : "text-subtle"}> · {percentual}% da renda{percentual > 20 ? " (acima do ideal de 20%)" : ""}</span>
        )}
      </p>

      <div className="mt-3">
        <p className="mb-1 text-xs text-subtle">Parcelas dos próximos 6 meses</p>
        <BarrasParcelas dados={proximos} />
      </div>

      {parcelamentos.length === 0 && <p className="mt-3 text-sm text-subtle">Nenhuma compra a prazo cadastrada.</p>}
      <ul className="mt-2 divide-y divide-line">
        {parcelamentos.map((p) => {
          const pos = difMeses(p.primeira, mes) + 1; // parcela que vence no mês selecionado
          const valorParcela = p.valor_total / p.parcelas;
          const restantes = pos < 1 ? p.parcelas : Math.max(0, p.parcelas - pos + 1);
          const situacao = pos < 1 ? `começa em ${rotuloMes(p.primeira)}` : pos > p.parcelas ? "quitada" : `parcela ${pos}/${p.parcelas} neste mês`;
          const pct = Math.min(100, Math.max(0, ((pos - 1) / p.parcelas) * 100));
          return (
            <li key={p.id} className="py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 break-words">
                  <p className="font-medium">{p.descricao}</p>
                  <p className="text-xs text-subtle">
                    {p.parcelas}x de {brl(valorParcela)} · total {brl(p.valor_total)} · {nomeDe(p.autor_email)}
                    {p.escopo === "casal" ? " · casal" : ""} · {situacao}
                  </p>
                  {restantes > 0 && <p className="text-xs text-subtle">Falta pagar {brl(valorParcela * restantes)} ({restantes} parcelas, contando este mês)</p>}
                </div>
                {!somenteLeitura && p.autor_email === meuEmail && (
                  <button type="button" aria-label={`Excluir ${p.descricao}`} onClick={() => g.onExcluirParcelamento(p.id)} className="rounded-full px-2 text-subtle hover:text-danger">
                    ✕
                  </button>
                )}
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-serie-2 transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
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
      {ordenada.length === 0 && (
        <p className="mt-2 text-sm text-subtle">Nada neste mês ainda. Toque em &ldquo;+ Cadastrar&rdquo; para lançar uma entrada ou um gasto.</p>
      )}
      <ul className="mt-2 divide-y divide-line">
        {ordenada.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 break-words">
              <p className="font-medium">{t.descricao}</p>
              <p className="text-xs text-subtle">
                {t.data.split("-").reverse().join("/")} · {nomeDe(t.autor_email)}
                {t.tipo === "saida" && ` · ${ROTULO[t.categoria]}`}
                {t.escopo === "casal" && " · casal"}
                {t.origem === "fixa" && " · renda fixa"}
                {t.origem === "parcela" && " · compra a prazo"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={t.tipo === "entrada" ? "text-primary" : "text-danger"}>
                {t.tipo === "entrada" ? "+" : "-"}
                {brl(t.valor)}
              </span>
              {onExcluir && !t.origem && t.autor_email === meuEmail && (
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
  g,
}: {
  transacoes: Transacao[];
  pessoa: Pessoa;
  eu: Pessoa;
  mes: string;
  somenteLeitura: boolean;
  nomeDe: (email: string) => string;
  g: Gestao;
}) {
  const filtro = (t: Transacao) => t.autor_email === pessoa.email && t.escopo === "pessoal";
  const r = resumirMes(transacoes, mes, filtro);
  const doMes = noMes(transacoes.filter(filtro), mes);
  const rendas = g.rendas.filter((x) => x.autor_email === pessoa.email);
  const parcs = g.parcelamentos.filter((p) => p.autor_email === pessoa.email && p.escopo === "pessoal");
  const reais = transacoes.filter((t) => t.autor_email === pessoa.email && !t.origem);

  return (
    <div className="space-y-6 sm:space-y-8">
      {!somenteLeitura && (
        <PrimeirosPassos
          temEntrada={rendas.length > 0 || reais.some((t) => t.tipo === "entrada")}
          temGasto={reais.some((t) => t.tipo === "saida") || parcs.length > 0}
          onNovo={g.onNovo}
          onSalario={g.onNovaRenda}
        />
      )}
      {somenteLeitura && (
        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-subtle">
          Você está vendo o painel de <strong className="text-foreground">{pessoa.nome}</strong> (somente leitura).
        </p>
      )}
      <Cartoes
        itens={[
          { titulo: "Disponível para gastar", valor: r.saldo, cor: r.saldo < 0 ? "text-danger" : "text-primary", dica: "Entradas menos saídas do mês" },
          { titulo: "Entradas do mês", valor: r.entradas, dica: `Fixa ${brl(r.fixa)} + variável ${brl(r.variavel)}` },
          { titulo: "Gastos do mês", valor: r.gasto.necessidade + r.gasto.lazer, dica: "Necessidades + lazer, com parcelas" },
          { titulo: "Reservado / Guardado", valor: r.gasto.economia, dica: "O que foi para economias" },
          { titulo: "Parcelas do mês", valor: r.parcelas, dica: "Compras a prazo que vencem" },
          { titulo: "Renda base dos limites", valor: r.base, dica: "Fixa + variável esperada" },
        ]}
      />
      {!somenteLeitura && <Acoes g={g} />}
      <RendaFixaCard rendas={rendas} mes={mes} r={r} meuEmail={eu.email} nomeDe={nomeDe} podeCadastrar={!somenteLeitura} g={g} />
      {!somenteLeitura && <Assistente key="pessoal" visao="pessoal" consultarIA={g.consultarIA} />}
      <Limites r={r} />
      <ParcelasPanel
        parcelamentos={parcs}
        parcelasTs={transacoes.filter(filtro).filter((t) => t.origem === "parcela")}
        mes={mes}
        r={r}
        meuEmail={eu.email}
        nomeDe={nomeDe}
        somenteLeitura={somenteLeitura}
        g={g}
      />
      <Movimentos titulo="Movimentações do mês" lista={doMes} nomeDe={nomeDe} meuEmail={eu.email} onExcluir={somenteLeitura ? undefined : g.onExcluir} />
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
  g,
}: {
  transacoes: Transacao[];
  eu: Pessoa;
  par?: Pessoa;
  mes: string;
  nomeDe: (email: string) => string;
  g: Gestao;
}) {
  const r = resumirMes(transacoes, mes);
  const doMes = noMes(transacoes, mes);
  const historico = ultimosMeses(6, mes).map((m) => {
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
    <div className="space-y-6 sm:space-y-8">
      <Dica titulo="O que é esta tela?">
        <p>Aqui os dois painéis se juntam: tudo que cada um recebeu e gastou no mês, mais os gastos e compras marcados como &ldquo;do casal&rdquo;.</p>
        <p>Passe o mouse (ou toque) nos gráficos para ver os valores exatos. Use as setas de mês lá em cima para ver outros meses.</p>
      </Dica>
      <Cartoes
        itens={[
          { titulo: "Saldo do casal", valor: r.saldo, cor: r.saldo < 0 ? "text-danger" : "text-primary" },
          { titulo: "Entradas combinadas", valor: r.entradas, dica: `Fixa ${brl(r.fixa)} + variável ${brl(r.variavel)}` },
          { titulo: "Saídas combinadas", valor: r.saidas },
          { titulo: `Reservado (${taxaEconomia}% da renda)`, valor: r.gasto.economia },
          { titulo: "Parcelas do mês", valor: r.parcelas, dica: "Compras a prazo que vencem" },
          { titulo: "Renda base dos limites", valor: r.base, dica: "Fixa + variável esperada" },
        ]}
      />
      <Acoes g={g} />

      <Assistente key="casal" visao="casal" consultarIA={g.consultarIA} />

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
                <div key={p.pessoa.email} className="flex flex-wrap justify-between gap-x-3">
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

      <RendaFixaCard rendas={g.rendas} mes={mes} r={r} meuEmail={eu.email} nomeDe={nomeDe} podeCadastrar g={g} />
      <Limites r={r} />
      <ParcelasPanel
        parcelamentos={g.parcelamentos}
        parcelasTs={transacoes.filter((t) => t.origem === "parcela")}
        mes={mes}
        r={r}
        meuEmail={eu.email}
        nomeDe={nomeDe}
        somenteLeitura={false}
        g={g}
      />
      <Movimentos titulo="Movimentações do casal no mês" lista={doMes} nomeDe={nomeDe} meuEmail={eu.email} onExcluir={g.onExcluir} />
    </div>
  );
}
