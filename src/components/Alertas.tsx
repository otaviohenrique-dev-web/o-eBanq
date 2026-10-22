"use client";

import { brl } from "@/lib/finance";
import { quando, type AlertaCartao, type Urgencia } from "@/lib/alertas";

const estilo: Record<Urgencia, string> = {
  hoje: "bg-danger text-white",
  urgente: "bg-danger/15 text-foreground",
  atencao: "bg-warning/20 text-foreground",
  calmo: "bg-muted text-foreground",
};
const selo: Record<Urgencia, string> = { hoje: "HOJE", urgente: "Urgente", atencao: "Atenção", calmo: "" };

/** Um cartão por quadro: valor da próxima fatura em destaque, quando vence e quando fecha. */
export function PainelAlertas({
  alertas,
  temCartao,
  nomeDe,
}: {
  alertas: AlertaCartao[];
  temCartao: boolean;
  nomeDe: (email: string) => string;
}) {
  if (!temCartao) {
    return (
      <p className="rounded-2xl bg-surface p-4 text-sm text-subtle shadow-sm">
        💳 Para ver aqui o valor da próxima fatura e as datas, abra <strong className="text-foreground">Meus bancos</strong>, toque em 💳 no seu cartão e informe o fechamento e o vencimento.
      </p>
    );
  }

  const urgentes = alertas.filter((a) => a.urgencia === "hoje" || a.urgencia === "urgente").length;
  const borda = urgentes > 0 ? "border-danger" : alertas.some((a) => a.urgencia === "atencao") ? "border-warning" : "border-line";

  return (
    <section aria-label="Faturas dos cartões" className={`rounded-2xl border-2 bg-surface p-4 shadow-sm sm:p-5 ${borda}`}>
      <h2 className="font-semibold">💳 Faturas dos cartões</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {alertas.map((a) => {
          const fechaEmBreve = a.urgenciaFecha === "hoje" || a.urgenciaFecha === "urgente";
          return (
            <li key={a.contaId} className={`rounded-xl p-4 ${estilo[a.urgencia]}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">
                  {a.contaNome}
                  <span className="text-xs font-normal opacity-80"> · {nomeDe(a.donoEmail)}</span>
                </p>
                {selo[a.urgencia] && <span className="shrink-0 rounded-full bg-black/15 px-2 py-0.5 text-xs font-semibold">{selo[a.urgencia]}</span>}
              </div>
              <p className="mt-1 text-2xl font-bold">{brl(a.valorFatura)}</p>
              <p className="text-sm font-medium">Vence {quando({ dias: a.diasVence, data: a.vence })}</p>
              <p className="mt-1 text-xs opacity-90">
                {a.fechada ? "Fatura fechada" : `Ainda aberta · fecha ${quando({ dias: a.diasFecha, data: a.fecha })}`}
                {a.valorTerceiros > 0 && ` · inclui ${brl(a.valorTerceiros)} de outras pessoas`}
              </p>
              {a.fechada && fechaEmBreve && (
                <p className="mt-1 text-xs font-semibold">
                  🔒 A próxima fatura fecha {quando({ dias: a.diasFecha, data: a.fecha })}: compras a partir daí vencem só em {a.vencimentoSeguinte.split("-").reverse().join("/")}.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
