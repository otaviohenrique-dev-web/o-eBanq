"use client";

import { useCallback, useEffect, useState } from "react";
import { brl } from "@/lib/finance";
import { quando, type Alerta, type Urgencia } from "@/lib/alertas";
import { Modal } from "./Forms";

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
  onTelegram,
}: {
  alertas: Alerta[];
  temCartao: boolean;
  nomeDe: (email: string) => string;
  onTelegram: () => void;
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
        <button type="button" onClick={onTelegram} className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-subtle">
          🔔 Avisos no Telegram
        </button>
      </div>

      {!temCartao ? (
        <p className="mt-2 text-sm text-subtle">
          Para ver aqui as datas de fechamento e vencimento (e receber avisos), abra <strong className="text-foreground">Meus bancos</strong>, toque em 💳 no seu cartão e informe os dois dias.
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

type Status = { configurado: boolean; faltando?: string[]; erro?: string; bot?: string; vinculado?: boolean; link?: string };

/** Conecta a conta do Telegram para receber os avisos. */
export function ModalTelegram({ token, onFechar }: { token: string; onFechar: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const chamar = useCallback(
    async (metodo: "GET" | "POST", corpo?: Record<string, unknown>) => {
      const r = await fetch("/api/telegram", {
        method: metodo,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: corpo ? JSON.stringify(corpo) : undefined,
      });
      return (await r.json()) as Record<string, unknown> & Status;
    },
    [token],
  );

  useEffect(() => {
    let vivo = true;
    chamar("GET")
      .then((s) => vivo && setStatus(s))
      .catch(() => vivo && setStatus({ configurado: false, erro: "Não foi possível consultar o servidor." }));
    return () => {
      vivo = false;
    };
  }, [chamar]);

  async function acao(nome: "verificar" | "teste" | "desvincular") {
    setOcupado(true);
    setMensagem("");
    try {
      const r = await chamar("POST", { acao: nome });
      if (nome === "verificar" && r.vinculado) setStatus((s) => (s ? { ...s, vinculado: true } : s));
      if (nome === "desvincular" && !r.erro) setStatus((s) => (s ? { ...s, vinculado: false } : s));
      setMensagem(String(r.mensagem ?? r.erro ?? ""));
    } catch {
      setMensagem("Falha de conexão. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Modal titulo="🔔 Avisos no Telegram" onFechar={onFechar}>
      <div className="space-y-3 text-sm">
        <p className="text-subtle">
          Você recebe uma mensagem quando o <strong className="text-foreground">vencimento</strong> do cartão está a 7, 3 e 1 dia (e no dia), e quando o{" "}
          <strong className="text-foreground">fechamento</strong> está a 3 e 1 dia (e no dia). Os avisos chegam por volta das 8h.
        </p>

        {status === null && <p className="text-subtle">Carregando...</p>}

        {status && !status.configurado && (
          <div className="rounded-lg bg-warning/15 p-3 text-xs">
            <p className="font-medium">O servidor ainda não está configurado para o Telegram.</p>
            {status.erro && <p className="mt-1">{status.erro}</p>}
            {status.faltando && status.faltando.length > 0 && (
              <p className="mt-1">
                Falta definir: <code>{status.faltando.join(", ")}</code>.
              </p>
            )}
          </div>
        )}

        {status?.configurado && !status.vinculado && (
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              <a href={status.link} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full bg-primary px-4 py-2 font-medium text-on-primary">
                Abrir @{status.bot} no Telegram
              </a>
              <span className="mt-1 block text-xs text-subtle">No Telegram, toque em Iniciar (Start).</span>
            </li>
            <li>
              Volte aqui e toque em{" "}
              <button type="button" disabled={ocupado} onClick={() => acao("verificar")} className="rounded-full border border-strong px-3 py-1 text-strong">
                {ocupado ? "Verificando..." : "Verificar conexão"}
              </button>
            </li>
          </ol>
        )}

        {status?.configurado && status.vinculado && (
          <div className="space-y-3">
            <p className="rounded-lg bg-primary/15 p-3 font-medium">✅ Telegram conectado</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={ocupado} onClick={() => acao("teste")} className="rounded-full border border-strong px-4 py-2 text-strong">
                Enviar mensagem de teste
              </button>
              <button type="button" disabled={ocupado} onClick={() => acao("desvincular")} className="rounded-full border border-line px-4 py-2 text-subtle">
                Desconectar
              </button>
            </div>
          </div>
        )}

        {mensagem && <p className="rounded-lg bg-muted p-3 text-xs">{mensagem}</p>}
      </div>
    </Modal>
  );
}
