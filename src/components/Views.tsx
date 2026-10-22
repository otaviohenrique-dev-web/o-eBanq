"use client";

import { useState } from "react";
import {
  addMeses,
  brl,
  CATEGORIAS,
  difMeses,
  dividasDeTerceiros,
  dividirGastos,
  noMes,
  pendentes,
  planejarParcelas,
  proximoVencimento,
  REGRA,
  resumir,
  resumirMes,
  rotuloMes,
  ROTULO,
  ultimosMeses,
  valorDaParcela,
  type Adiantada,
  type Assinatura,
  type Conta,
  type Parcelamento,
  type Pessoa,
  type RendaFixa,
  type Repasse,
  type Resumo,
  type Terceiro,
  type Transacao,
} from "@/lib/finance";
import { Dica, PrimeirosPassos } from "./Ajuda";
import { BarrasMeses, BarrasPessoas, Rosca } from "./Charts";
import { AssinaturasPanel } from "./AssinaturasPanel";
import { ChipConta, ChipTerceiro, ChipTipo, ContasPanel } from "./Contas";
import { Secao } from "./Secao";
import { CartaoEmprestadoPanel } from "./Terceiros";

const painel = "rounded-2xl bg-surface p-5 shadow-sm";
const botaoPrimario = "rounded-full bg-primary px-6 py-3 font-medium text-on-primary";
const botaoSecundario = "rounded-full border border-strong px-6 py-3 font-medium text-strong";
const botaoPequeno = "rounded-full border border-line px-3 py-1 text-xs text-subtle";

export type Gestao = {
  hoje: string;
  terceiros: Terceiro[];
  repasses: Repasse[];
  assinaturas: Assinatura[];
  onNovaAssinatura: () => void;
  onCancelarAssinatura: (id: string) => void;
  onExcluirAssinatura: (id: string) => void;
  onNovoRepasse: (terceiroId: string) => void;
  onExcluirRepasse: (id: string) => void;
  onEditarRepasse: (id: string) => void;
  onEditarCompra: (id: string, tipo: "parcelado" | "assinatura") => void;
  onRenomearTerceiro: (id: string, nome: string) => void;
  adiantadas: Adiantada[];
  onAdiantarFatura: () => void;
  onAdiantarCompra: (parcelamentoId: string) => void;
  onDesfazerAdiantamento: (parcelamentoId: string) => void;
  onDefinirCartao: (id: string, fechamento: number | null, vencimento: number | null) => Promise<string | null>;
  contas: Conta[];
  saldos: Map<string, number>;
  onAdicionarConta: (nome: string, saldoInicial: number) => Promise<string | null>;
  onExcluirConta: (id: string) => void;
  rendas: RendaFixa[];
  parcelamentos: Parcelamento[];
  onNovo: () => void;
  onComprar: () => void;
  onNovaRenda: () => void;
  onEncerrarRenda: (id: string) => void;
  onExcluirRenda: (id: string) => void;
  onNovoParcelamento: () => void;
  onExcluirParcelamento: (id: string) => void;
  onExcluir: (id: string) => void;
};

const proximaFatura = (ts: Transacao[], mes: string) =>
  noMes(
    ts.filter((t) => t.origem === "parcela"),
    addMeses(mes, 1),
  ).reduce((acc, t) => acc + t.valor, 0);

/** Fatura em aberto de cada cartão: soma das parcelas (inclusive as do casal) que vencem no próximo vencimento. */
function faturasDosCartoes(contas: Conta[], parcelasTs: Transacao[], hojeStr: string) {
  const mapa = new Map<string, { vence: string; total: number }>();
  for (const c of contas) {
    if (!c.dia_vencimento) continue;
    const vence = proximoVencimento(hojeStr, c.dia_vencimento);
    const total = parcelasTs
      .filter((t) => t.conta_id === c.id && !t.paga && t.data.startsWith(vence.slice(0, 7)))
      .reduce((acc, t) => acc + t.valor, 0);
    mapa.set(c.id, { vence, total });
  }
  return mapa;
}

function Cartoes({ itens }: { itens: { titulo: string; valor: number; cor?: string; dica?: string }[] }) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {itens.map((c, i) => (
        <div key={c.titulo} className={`animar-entrada rounded-2xl bg-surface p-4 shadow-sm sm:p-5 ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
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
              <ChipConta conta={g.contas.find((c) => c.id === x.conta_id)} />
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
  assinaturasTs,
  mes,
  r,
  meuEmail,
  nomeDe,
  somenteLeitura,
  mostrarDono,
  g,
}: {
  parcelamentos: Parcelamento[];
  parcelasTs: Transacao[];
  assinaturasTs: Transacao[];
  mes: string;
  r: Resumo;
  meuEmail: string;
  nomeDe: (email: string) => string;
  somenteLeitura: boolean;
  mostrarDono: boolean;
  g: Gestao;
}) {
  // Compras de terceiros no seu cartão ficam fora do seu plano (veja "Cartão emprestado").
  const proprias = parcelasTs.filter((t) => !t.terceiro_id);
  const parcelamentosProprios = parcelamentos.filter((p) => !p.terceiro_id);
  const assinProx = assinaturasTs.filter((t) => t.data.startsWith(addMeses(mes, 1))).reduce((acc, t) => acc + t.valor, 0);
  const percentual = r.base > 0 ? Math.round((r.parcelas / r.base) * 100) : 0;
  const plano = planejarParcelas(parcelamentosProprios, proprias, mes, r.base, g.adiantadas);
  const totalPor = (esc: string) => plano.itensProxima.filter((i) => i.escopo === esc).reduce((acc, i) => acc + i.valor, 0);
  return (
    <section className={painel}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Compras a prazo</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Dica>
            <p>Cadastre o valor total e o número de parcelas: o sistema lança uma parcela por mês e soma tudo que vence em cada mês.</p>
            <p>O ideal é que as parcelas somem até 20% da renda.</p>
            <p>Para pagar ou adiantar, use &ldquo;Pagar / adiantar fatura&rdquo; (um mês inteiro) ou o botão em cada compra. Informe quem pagou: se não foi o dono da compra, o acerto entre vocês é calculado sozinho. Antes do vencimento conta como adiantamento, e as parcelas entram na data do pagamento.</p>
          </Dica>
          {!somenteLeitura && (
            <>
              <button type="button" onClick={g.onNovoParcelamento} className={botaoPequeno}>
                + Compra a prazo
              </button>
              <button type="button" onClick={g.onAdiantarFatura} className={botaoPequeno}>
                💳 Pagar / adiantar fatura
              </button>
            </>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm">
        A pagar em {rotuloMes(mes)}: <strong className="text-lg">{brl(r.parcelas)}</strong>
        {r.base > 0 && (
          <span className={percentual > 20 ? "text-danger" : "text-subtle"}> · {percentual}% da renda{percentual > 20 ? " (acima do ideal de 20%)" : ""}</span>
        )}
      </p>

      <div className="mt-4 rounded-xl bg-muted p-4">
        <p className="text-sm text-subtle">Próxima fatura · {rotuloMes(plano.mesFatura)}</p>
        <p className="text-2xl font-semibold">{brl(plano.proximaFatura)}</p>
        <p className="text-xs text-subtle">
          {plano.proximaFatura === plano.faturaAtual
            ? "Igual à fatura deste mês."
            : `${plano.proximaFatura > plano.faturaAtual ? "Sobe" : "Cai"} ${brl(Math.abs(plano.proximaFatura - plano.faturaAtual))} em relação a este mês (${brl(plano.faturaAtual)}).`}{" "}
          Já entra como gasto no plano daquele mês, na categoria de cada compra.
        </p>
        {assinProx > 0 && (
          <p className="mt-2 text-xs text-subtle">
            🔄 + Assinaturas no mês seguinte: <strong className="text-foreground">{brl(assinProx)}</strong> · total da fatura{" "}
            <strong className="text-foreground">{brl(plano.proximaFatura + assinProx)}</strong>
          </p>
        )}
        {mostrarDono && plano.itensProxima.length > 0 && (
          <p className="mt-2 text-xs text-subtle">
            👤 Pessoais {brl(totalPor("pessoal"))} · 👥 Do casal {brl(totalPor("casal"))}
          </p>
        )}
        {plano.itensProxima.length === 0 ? (
          <p className="mt-3 text-sm text-subtle">Nenhuma parcela vence no mês seguinte.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm">
            {plano.itensProxima.map((i, k) => (
              <li key={k} className="flex flex-wrap items-center justify-between gap-x-3">
                <span className="min-w-0 break-words">
                  {i.descricao} <ChipTipo tipo={i.escopo} />
                </span>
                <span className="text-subtle">
                  {brl(i.valor)} · {ROTULO[i.categoria]}
                  {mostrarDono ? ` · ${nomeDe(i.autor_email)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <Dica titulo="Estratégias para pagar">
          <ul className="space-y-2">
            {plano.estrategias.map((e) => (
              <li key={e.titulo}>
                <strong className="text-foreground">{e.titulo}.</strong> {e.texto}
              </li>
            ))}
          </ul>
        </Dica>
      </div>

      <div className="mt-3">
        <Dica titulo="Em qual categoria a parcela entra?">
          <p>A parcela entra no mês em que vence, como gasto, na categoria do que você comprou (e não do cartão).</p>
          <p>Necessidades: o essencial. Lazer: o que é desejo. Economias: só o que você guarda ou investe. Na dúvida: se ficar sem aquilo você perde o básico, é necessidade.</p>
        </Dica>
      </div>

      {parcelamentos.length === 0 && <p className="mt-3 text-sm text-subtle">Nenhuma compra a prazo cadastrada.</p>}
      <ul className="mt-2 divide-y divide-line">
        {parcelamentos.map((p) => {
          const pos = difMeses(p.primeira, mes) + 1; // parcela que vence no mês selecionado
          const valorParcela = p.valor_total / p.parcelas;
          const pend = pendentes(p, mes, g.adiantadas);
          const restantes = pend.length;
          const saldoRestante = pend.reduce((acc, k) => acc + valorDaParcela(p, k), 0);
          const ads = g.adiantadas.filter((a) => a.parcelamento_id === p.id);
          const situacao =
            restantes === 0 ? "quitada" : pos < 1 ? `começa em ${rotuloMes(p.primeira)}` : pos > p.parcelas ? "quitada" : `parcela ${pos}/${p.parcelas} neste mês`;
          const pct = Math.min(100, Math.max(0, ((p.parcelas - restantes) / p.parcelas) * 100));
          return (
            <li key={p.id} className="py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 break-words">
                  <p className="font-medium">{p.descricao}</p>
                  <p className="text-xs text-subtle">
                    {p.parcelas}x de {brl(valorParcela)} · total {brl(p.valor_total)} · {nomeDe(p.autor_email)}
                    {p.escopo === "casal" ? " · casal" : ""} · {situacao}
                    {p.dia_vencimento ? ` · vence dia ${p.dia_vencimento}` : ""}
                  </p>
                  <ChipConta conta={g.contas.find((c) => c.id === p.conta_id)} />
                  <ChipTerceiro nome={g.terceiros.find((t) => t.id === p.terceiro_id)?.nome} />
                  {restantes > 0 && <p className="text-xs text-subtle">Falta pagar {brl(saldoRestante)} ({restantes} parcelas, contando este mês)</p>}
                  {ads.length > 0 && (
                    <p className="mt-1 text-xs">
                      <ChipTipo tipo="paga" />{" "}
                      <span className="text-subtle">
                        {ads.length} {ads.length === 1 ? "parcela paga" : "parcelas pagas"} · por{" "}
                        {[...new Set(ads.map((a) => nomeDe(a.pago_por ?? p.autor_email)))].join(", ")}
                      </span>
                    </p>
                  )}
                  {!somenteLeitura && (restantes > 0 || ads.some((a) => a.autor_email === meuEmail)) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {restantes > 0 && (
                        <button type="button" onClick={() => g.onAdiantarCompra(p.id)} className={botaoPequeno}>
                          💳 Pagar / adiantar parcelas
                        </button>
                      )}
                      {ads.some((a) => a.autor_email === meuEmail) && (
                        <button type="button" onClick={() => g.onDesfazerAdiantamento(p.id)} className={botaoPequeno}>
                          Desfazer pagamentos
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {!somenteLeitura && p.autor_email === meuEmail && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" aria-label={`Editar ${p.descricao}`} title="Editar (data, valor, parcelas, cartão...)" onClick={() => g.onEditarCompra(p.id, "parcelado")} className="rounded-full px-1.5">
                      ✏️
                    </button>
                    <button type="button" aria-label={`Excluir ${p.descricao}`} onClick={() => g.onExcluirParcelamento(p.id)} className="rounded-full px-2 text-subtle hover:text-danger">
                      ✕
                    </button>
                  </div>
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
  contas,
  terceiros,
  nomeDe,
  meuEmail,
  onExcluir,
  filtrarEscopo,
}: {
  titulo: string;
  lista: Transacao[];
  contas: Conta[];
  terceiros: Terceiro[];
  nomeDe: (email: string) => string;
  meuEmail: string;
  onExcluir?: (id: string) => void;
  filtrarEscopo: boolean;
}) {
  const [escopo, setEscopo] = useState<"todos" | "pessoal" | "casal">("todos");
  const [conta, setConta] = useState<string>("todas");
  const visiveis = lista
    .filter((t) => escopo === "todos" || t.escopo === escopo)
    .filter((t) => conta === "todas" || (conta === "sem" ? !t.conta_id : t.conta_id === conta))
    .sort((x, y) => y.data.localeCompare(x.data));
  const chip = (ativo: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${ativo ? "border-strong bg-strong text-background" : "border-line text-subtle"}`;
  const contasUsadas = contas.filter((c) => lista.some((t) => t.conta_id === c.id));
  return (
    <section className={painel}>
      <h2 className="font-semibold">{titulo}</h2>
      {(filtrarEscopo || contasUsadas.length > 0) && lista.length > 0 && (
        <div className="mt-3 space-y-2">
          {filtrarEscopo && (
            <div className="flex flex-wrap gap-2" aria-label="Filtrar por tipo">
              <button type="button" className={chip(escopo === "todos")} onClick={() => setEscopo("todos")}>
                Todos
              </button>
              <button type="button" className={chip(escopo === "pessoal")} onClick={() => setEscopo("pessoal")}>
                👤 Pessoais
              </button>
              <button type="button" className={chip(escopo === "casal")} onClick={() => setEscopo("casal")}>
                👥 Do casal
              </button>
            </div>
          )}
          {contasUsadas.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Filtrar por banco">
              <button type="button" className={chip(conta === "todas")} onClick={() => setConta("todas")}>
                Todos os bancos
              </button>
              {contasUsadas.map((c) => (
                <button key={c.id} type="button" className={chip(conta === c.id)} onClick={() => setConta(c.id)}>
                  {c.nome}
                </button>
              ))}
              <button type="button" className={chip(conta === "sem")} onClick={() => setConta("sem")}>
                Sem banco
              </button>
            </div>
          )}
        </div>
      )}
      {lista.length === 0 && (
        <p className="mt-2 text-sm text-subtle">Nada neste mês ainda. Toque em &ldquo;+ Cadastrar&rdquo; para lançar uma entrada ou um gasto.</p>
      )}
      {lista.length > 0 && visiveis.length === 0 && <p className="mt-3 text-sm text-subtle">Nenhum lançamento com esses filtros.</p>}
      <ul className="mt-2 divide-y divide-line">
        {visiveis.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 break-words">
              <p className="font-medium">{t.descricao}</p>
              <p className="text-xs text-subtle">
                {t.data.split("-").reverse().join("/")} · {nomeDe(t.autor_email)}
                {t.tipo === "saida" && ` · ${ROTULO[t.categoria]}`}
                {t.paga && t.pago_por ? ` · pago por ${nomeDe(t.pago_por)}` : ""}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(filtrarEscopo || t.escopo === "casal") && <ChipTipo tipo={t.escopo} />}
                {t.origem && <ChipTipo tipo={t.origem} />}
                {t.paga && <ChipTipo tipo={t.adiantada ? "adiantada" : "paga"} />}
                <ChipConta conta={contas.find((c) => c.id === t.conta_id)} />
                {t.terceiro_id && t.origem !== "reembolso" && <ChipTerceiro nome={terceiros.find((x) => x.id === t.terceiro_id)?.nome} />}
              </div>
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
  const casalPago = noMes(transacoes, mes)
    .filter((t) => t.autor_email === pessoa.email && t.escopo === "casal" && t.tipo === "saida")
    .reduce((acc, t) => acc + t.valor, 0);
  const contasDaPessoa = g.contas.filter((c) => c.autor_email === pessoa.email);
  const dividas = dividasDeTerceiros(transacoes, g.terceiros.filter((t) => t.autor_email === pessoa.email), g.repasses, mes);
  const faturas = faturasDosCartoes(g.contas, transacoes.filter((t) => t.origem === "parcela" || t.origem === "assinatura"), g.hoje);

  const totalSaldos = contasDaPessoa.reduce((acc, c) => acc + (g.saldos.get(c.id) ?? 0), 0);
  const faturaProxima = proximaFatura(transacoes.filter(filtro).filter((t) => !t.terceiro_id), mes);
  const assinaturasMes = doMes.filter((t) => t.origem === "assinatura" && !t.terceiro_id).reduce((acc, t) => acc + t.valor, 0);
  const aReceber = dividas.reduce((acc, d) => acc + d.emAberto, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
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
          { titulo: "Disponível para gastar", valor: r.saldo, cor: r.saldo < 0 ? "text-danger" : "text-primary" },
          { titulo: "Entradas do mês", valor: r.entradas },
          { titulo: "Gastos do mês", valor: r.gasto.necessidade + r.gasto.lazer },
        ]}
      />
      {casalPago > 0 && (
        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-subtle">
          👥 {somenteLeitura ? `${pessoa.nome} pagou` : "Você pagou"} <strong className="text-foreground">{brl(casalPago)}</strong> em gastos do casal neste mês (aparecem na aba Casal).
        </p>
      )}
      {!somenteLeitura && <Acoes g={g} />}
      <Limites r={r} />

      <div className="space-y-3">
        <Secao titulo="Movimentações do mês" resumo={`${doMes.length} ${doMes.length === 1 ? "lançamento" : "lançamentos"}`} aberta>
          <Movimentos
            titulo={somenteLeitura ? `Lançamentos pessoais de ${pessoa.nome}` : "Seus lançamentos pessoais"}
            lista={doMes}
            contas={g.contas}
            terceiros={g.terceiros}
            nomeDe={nomeDe}
            meuEmail={eu.email}
            onExcluir={somenteLeitura ? undefined : g.onExcluir}
            filtrarEscopo={false}
          />
        </Secao>
        <Secao titulo="Compras a prazo" resumo={parcs.length === 0 ? "nenhuma" : `próxima fatura ${brl(faturaProxima)}`}>
          <ParcelasPanel
            parcelamentos={parcs}
            parcelasTs={transacoes.filter(filtro).filter((t) => t.origem === "parcela")}
            mes={mes}
            r={r}
            meuEmail={eu.email}
            nomeDe={nomeDe}
            assinaturasTs={transacoes.filter(filtro).filter((t) => t.origem === "assinatura")}
            somenteLeitura={somenteLeitura}
            mostrarDono={false}
            g={g}
          />
        </Secao>
        <Secao titulo="Assinaturas" resumo={assinaturasMes > 0 ? `${brl(assinaturasMes)} por mês` : "nenhuma"}>
          <AssinaturasPanel
            assinaturas={g.assinaturas.filter((a) => a.autor_email === pessoa.email && a.escopo === "pessoal")}
            mes={mes}
            contas={g.contas}
            terceiros={g.terceiros}
            meuEmail={eu.email}
            nomeDe={nomeDe}
            somenteLeitura={somenteLeitura}
            onNova={g.onNovaAssinatura}
            onCancelar={g.onCancelarAssinatura}
            onExcluir={g.onExcluirAssinatura}
            onEditar={(id) => g.onEditarCompra(id, "assinatura")}
          />
        </Secao>
        <Secao titulo="Salário e renda" resumo={r.fixa > 0 ? `salário ${brl(r.fixa)}` : "não cadastrado"}>
          <RendaFixaCard rendas={rendas} mes={mes} r={r} meuEmail={eu.email} nomeDe={nomeDe} podeCadastrar={!somenteLeitura} g={g} />
        </Secao>
        <Secao titulo={somenteLeitura ? `Bancos de ${pessoa.nome}` : "Meus bancos"} resumo={contasDaPessoa.length === 0 ? "nenhum" : `${contasDaPessoa.length} · ${brl(totalSaldos)}`}>
          <ContasPanel
            titulo={somenteLeitura ? `Bancos de ${pessoa.nome}` : "Meus bancos"}
            contas={contasDaPessoa}
            saldos={g.saldos}
            meuEmail={eu.email}
            nomeDe={nomeDe}
            podeEditar={!somenteLeitura}
            mostrarDono={false}
            onAdicionar={g.onAdicionarConta}
            onExcluir={g.onExcluirConta}
            faturas={faturas}
            onDefinirCartao={g.onDefinirCartao}
          />
        </Secao>
        {!somenteLeitura && (
          <Secao titulo="🤝 Cartão emprestado" resumo={dividas.length === 0 ? "ninguém" : aReceber > 0.005 ? `${brl(aReceber)} a receber` : "em dia"}>
            <CartaoEmprestadoPanel
              dividas={dividas}
              mes={mes}
              podeEditar
              onRepasse={g.onNovoRepasse}
              onExcluirRepasse={g.onExcluirRepasse}
              onEditarRepasse={g.onEditarRepasse}
              onEditarCompra={g.onEditarCompra}
              onRenomear={g.onRenomearTerceiro}
            />
          </Secao>
        )}
      </div>
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
  const pessoalVsCasal = pessoas.map((p) => {
    const saidas = doMes.filter((t) => t.autor_email === p.email && t.tipo === "saida");
    const somaEscopo = (esc: string) => saidas.filter((t) => t.escopo === esc).reduce((acc, t) => acc + t.valor, 0);
    return { nome: p.nome, entradas: somaEscopo("pessoal"), saidas: somaEscopo("casal") };
  });
  const divisao = par ? dividirGastos(doMes, [eu, par]) : null;
  const faturas = faturasDosCartoes(g.contas, transacoes.filter((t) => t.origem === "parcela" || t.origem === "assinatura"), g.hoje);

  const totalSaldos = g.contas.reduce((acc, c) => acc + (g.saldos.get(c.id) ?? 0), 0);
  const faturaProxima = proximaFatura(transacoes.filter((t) => !t.terceiro_id), mes);
  const assinaturasMes = doMes.filter((t) => t.origem === "assinatura" && !t.terceiro_id).reduce((acc, t) => acc + t.valor, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <Cartoes
        itens={[
          { titulo: "Saldo do casal", valor: r.saldo, cor: r.saldo < 0 ? "text-danger" : "text-primary" },
          { titulo: "Entradas do casal", valor: r.entradas },
          { titulo: "Saídas do casal", valor: r.saidas },
        ]}
      />
      <Acoes g={g} />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <section className={painel}>
          <h2 className="font-semibold">Quem repassa quanto</h2>
          {!divisao ? (
            <p className="mt-2 text-sm text-subtle">Autorize o e-mail do seu par para dividir os gastos.</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <p className="rounded-lg bg-muted px-3 py-3 text-base">
                {divisao.acerto ? (
                  <>
                    <strong>{divisao.acerto.de.nome}</strong> repassa <strong>{brl(divisao.acerto.valor)}</strong> para <strong>{divisao.acerto.para.nome}</strong>.
                  </>
                ) : (
                  "Tudo certo, ninguém deve nada."
                )}
              </p>
              <p className="text-xs text-subtle">
                Gastos do casal no mês: {brl(divisao.totalCasal)}, divididos pela renda de cada um.
                {divisao.pessoaisPagosPorOutro > 0 && ` Inclui ${brl(divisao.pessoaisPagosPorOutro)} de compras pessoais pagas pela outra pessoa.`}
              </p>
              {divisao.partes.map((p) => (
                <div key={p.pessoa.email} className="flex flex-wrap justify-between gap-x-3 text-xs">
                  <span>{p.pessoa.nome}</span>
                  <span className="text-subtle">
                    deveria {brl(p.devido)} · pagou {brl(p.pago)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className={painel}>
          <h2 className="mb-4 font-semibold">Para onde foi o dinheiro</h2>
          <Rosca gasto={r.gasto} />
        </section>
      </div>

      <Limites r={r} />

      <div className="space-y-3">
        <Secao titulo="Movimentações do mês" resumo={`${doMes.length} ${doMes.length === 1 ? "lançamento" : "lançamentos"}`} aberta>
          <Movimentos
            titulo="Movimentações do casal"
            lista={doMes}
            contas={g.contas}
            terceiros={g.terceiros}
            nomeDe={nomeDe}
            meuEmail={eu.email}
            onExcluir={g.onExcluir}
            filtrarEscopo
          />
        </Secao>
        <Secao titulo="Compras a prazo" resumo={g.parcelamentos.length === 0 ? "nenhuma" : `próxima fatura ${brl(faturaProxima)}`}>
          <ParcelasPanel
            parcelamentos={g.parcelamentos}
            parcelasTs={transacoes.filter((t) => t.origem === "parcela")}
            mes={mes}
            r={r}
            meuEmail={eu.email}
            nomeDe={nomeDe}
            assinaturasTs={transacoes.filter((t) => t.origem === "assinatura")}
            somenteLeitura={false}
            mostrarDono
            g={g}
          />
        </Secao>
        <Secao titulo="Assinaturas" resumo={assinaturasMes > 0 ? `${brl(assinaturasMes)} por mês` : "nenhuma"}>
          <AssinaturasPanel
            assinaturas={g.assinaturas}
            mes={mes}
            contas={g.contas}
            terceiros={g.terceiros}
            meuEmail={eu.email}
            nomeDe={nomeDe}
            somenteLeitura={false}
            onNova={g.onNovaAssinatura}
            onCancelar={g.onCancelarAssinatura}
            onExcluir={g.onExcluirAssinatura}
            onEditar={(id) => g.onEditarCompra(id, "assinatura")}
          />
        </Secao>
        <Secao titulo="Gráficos" resumo="6 meses, contribuição de cada um">
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-medium">Últimos 6 meses</h3>
              <BarrasMeses dados={historico} />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium">Contribuição de cada um</h3>
              <BarrasPessoas dados={porPessoa} />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium">Gastos pessoais x gastos do casal</h3>
              <BarrasPessoas dados={pessoalVsCasal} rotulos={["👤 Pessoais", "👥 Do casal"]} />
            </div>
          </div>
        </Secao>
        <Secao titulo="Salário e renda" resumo={r.fixa > 0 ? `fixa ${brl(r.fixa)}` : "não cadastrada"}>
          <RendaFixaCard rendas={g.rendas} mes={mes} r={r} meuEmail={eu.email} nomeDe={nomeDe} podeCadastrar g={g} />
        </Secao>
        <Secao titulo="Bancos do casal" resumo={g.contas.length === 0 ? "nenhum" : `${g.contas.length} · ${brl(totalSaldos)}`}>
          <ContasPanel
            titulo="Onde está o dinheiro do casal"
            contas={g.contas}
            saldos={g.saldos}
            meuEmail={eu.email}
            nomeDe={nomeDe}
            podeEditar
            mostrarDono
            onAdicionar={g.onAdicionarConta}
            onExcluir={g.onExcluirConta}
            faturas={faturas}
            onDefinirCartao={g.onDefinirCartao}
          />
        </Secao>
      </div>
    </div>
  );
}
