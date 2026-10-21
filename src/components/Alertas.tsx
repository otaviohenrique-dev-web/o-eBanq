"use client";

import { brl } from "@/lib/finance";
import { quando, type Alerta, type Urgencia } from "@/lib/alertas";

const estilo: Record<Urgencia, string> = {
  hoje: "bg-danger text-white",
  urgente: "bg-danger/15 text-danger",
  atencao: "bg-warning/20 text-foreground",
  calmo: "bg-muted text-subtle",
};
const rotulo: Record<Urgencia, string> = { hoje: "HOJE", urgente: "Urgente", atencao: "Atenção", calmo: "" };

/** Espaço de destaque com as datas de fechamento e vencimento dos cartões, ordenadas pela proximidade. */
export function PainelAlertas({
  alertas,
  temCartao,
  nomeDe,
}: {
  alertas: Alerta[];
  temCartao: boolean;
  nomeDe: (email: string) => string;
}) {
  const urgentes = alertas.filter((a) => a.urgencia === "hoje" || a.urgencia === "urgente").length;
  const atencao = alertas.filter((a) => a.urgencia === "atencao").length;
  const borda = urgentes > 0 ? "border-danger bg-danger/5" : atencao > 0 ? "border-warning bg-warning/5" : "border-line bg-surface";

  return (
    <section aria-label="Datas dos cartões" className={`rounded-2xl border-2 p-4 shadow-sm sm:p-5 ${borda}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          📅 Datas dos cartões
          {urgentes > 0 && <span className="ml-2 rounded-full bg-danger px-2 py-0.5 text-xs font-medium text-white">{urgentes} para os próximos dias</span>}
        </h2>
      </div>

      {!temCartao ? (
        <p className="mt-2 text-sm text-subtle">
          Para ver aqui as datas de fechamento e vencimento , abra <strong className="text-foreground">Meus bancos</strong>, toque em 💳 no seu cartão e informe os dois dias.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {alertas.map((a) => (
            <li key={a.chave} className={`flex items-start gap-3 rounded-xl p-3 text-sm ${estilo[a.urgencia]}`}>
              <span aria-hidden className="text-lg leading-none">
                {a.tipo === "vencimento" ? "💸" : "🔒"}
              </span>
              <div className="min-w-0">
                <p className="font-semibold">
                  {a.tipo === "vencimento" ? "Vencimento" : "Fechamento"} · {a.contaNome}
                  <span className="font-normal opacity-80"> ({nomeDe(a.donoEmail)})</span>
                </p>
                <p>
                  {a.urgencia !== "calmo" && <strong>{rotulo[a.urgencia]} · </strong>}
                  {quando(a)}
                </p>
                {a.tipo === "vencimento" ? (
                  <p className="text-xs opacity-90">
                    Fatura: <strong>{brl(a.valorFatura)}</strong>
                    {a.valorTerceiros > 0 && ` (inclui ${brl(a.valorTerceiros)} de outras pessoas)`}
                  </p>
                ) : (
                  a.vencimentoSeguinte && (
                    <p className="text-xs opacity-90">Compras a partir daí vencem em {a.vencimentoSeguinte.split("-").reverse().join("/")}.</p>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
