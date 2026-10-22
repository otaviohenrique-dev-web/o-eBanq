"use client";

import { useState } from "react";

/**
 * Seção recolhível: mostra só o título e um resumo de uma linha; o conteúdo abre ao tocar.
 * Os painéis internos perdem o cartão e o título próprios (ver `.secao-corpo` em globals.css).
 */
export function Secao({
  titulo,
  resumo,
  aberta = false,
  children,
}: {
  titulo: string;
  resumo?: string;
  aberta?: boolean;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(aberta);
  return (
    <section className="rounded-2xl bg-surface shadow-sm">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        className="botao-plano flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left sm:px-5"
      >
        <span className="font-semibold">{titulo}</span>
        <span className="flex min-w-0 items-center gap-2 text-sm text-subtle">
          {resumo && <span className="truncate">{resumo}</span>}
          <span aria-hidden>{aberto ? "▴" : "▾"}</span>
        </span>
      </button>
      {aberto && <div className="secao-corpo animar-entrada border-t border-line px-4 pb-5 pt-4 sm:px-5">{children}</div>}
    </section>
  );
}
