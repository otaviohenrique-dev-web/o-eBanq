"use client";

import { brl, rotuloMes, type Assinatura, type Conta, type Terceiro } from "@/lib/finance";
import { Dica } from "./Ajuda";
import { ChipConta, ChipTipo } from "./Contas";

/** Cobranças mensais sem número de parcelas: duram até serem canceladas. */
export function AssinaturasPanel({
  assinaturas,
  mes,
  contas,
  terceiros,
  meuEmail,
  nomeDe,
  somenteLeitura,
  onNova,
  onCancelar,
  onExcluir,
  onEditar,
}: {
  assinaturas: Assinatura[];
  mes: string;
  contas: Conta[];
  terceiros: Terceiro[];
  meuEmail: string;
  nomeDe: (email: string) => string;
  somenteLeitura: boolean;
  onNova: () => void;
  onCancelar: (id: string) => void;
  onExcluir: (id: string) => void;
  onEditar: (id: string) => void;
}) {
  const ativa = (a: Assinatura) => a.inicio <= mes && (!a.fim || a.fim >= mes);
  const totalMes = assinaturas.filter((a) => ativa(a) && !a.terceiro_id).reduce((acc, a) => acc + a.valor_mensal, 0);
  const ordenadas = [...assinaturas].sort((x, y) => Number(ativa(y)) - Number(ativa(x)) || x.descricao.localeCompare(y.descricao));

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">🔄 Assinaturas</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Dica>
            <p>Assinatura é uma cobrança mensal sem número de parcelas (streaming, plano, app). Ela se repete todo mês até você cancelar.</p>
            <p>Entra como gasto do mês na categoria escolhida e soma na fatura do cartão. Ao cancelar, ela deixa de contar a partir do próximo mês.</p>
          </Dica>
          {!somenteLeitura && (
            <button type="button" onClick={onNova} className="rounded-full border border-line px-3 py-1 text-xs text-subtle">
              + Assinatura
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm">
        Suas assinaturas em {rotuloMes(mes)}: <strong className="text-lg">{brl(totalMes)}</strong>
      </p>

      {assinaturas.length === 0 && <p className="mt-2 text-sm text-subtle">Nenhuma assinatura cadastrada.</p>}
      <ul className="mt-2 divide-y divide-line">
        {ordenadas.map((a) => {
          const terceiro = terceiros.find((t) => t.id === a.terceiro_id);
          const dono = !somenteLeitura && a.autor_email === meuEmail;
          return (
            <li key={a.id} className={`flex items-start justify-between gap-3 py-3 text-sm ${ativa(a) ? "" : "opacity-60"}`}>
              <div className="min-w-0 break-words">
                <p className="font-medium">
                  {a.descricao} · {brl(a.valor_mensal)}/mês
                </p>
                <p className="text-xs text-subtle">
                  {nomeDe(a.autor_email)} · desde {rotuloMes(a.inicio)}
                  {a.dia_vencimento ? ` · vence dia ${a.dia_vencimento}` : ""}
                  {a.fim ? ` · cancelada, vale até ${rotuloMes(a.fim)}` : ativa(a) ? " · ativa" : " · começa depois"}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <ChipTipo tipo={a.escopo} />
                  <ChipConta conta={contas.find((c) => c.id === a.conta_id)} />
                  {terceiro && <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs">🤝 {terceiro.nome}</span>}
                </div>
              </div>
              {dono && (
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" aria-label={`Editar ${a.descricao}`} title="Editar (data, valor, cartão...)" onClick={() => onEditar(a.id)} className="rounded-full px-1.5">
                    ✏️
                  </button>
                  {!a.fim && (
                    <button type="button" onClick={() => onCancelar(a.id)} className="rounded-full border border-line px-3 py-1 text-xs text-subtle" title="Deixa de contar a partir do próximo mês">
                      Cancelar
                    </button>
                  )}
                  <button type="button" aria-label={`Excluir ${a.descricao}`} onClick={() => onExcluir(a.id)} className="rounded-full px-2 text-subtle hover:text-danger">
                    ✕
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
