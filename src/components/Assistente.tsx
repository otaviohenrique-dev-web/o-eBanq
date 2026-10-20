"use client";

import { useState } from "react";
import { Dica } from "./Ajuda";

const PERGUNTAS = {
  pessoal: ["Onde posso economizar este mês?", "Estou gastando demais em alguma categoria?", "Como organizar minha renda que varia?"],
  casal: ["Estamos dividindo bem os gastos?", "Dá para guardar mais como casal?", "Como reduzir nossas parcelas?"],
};

/** Assistente de IA (Gemini): analisa o mês e responde perguntas com base nos números do painel. */
export default function Assistente({
  visao,
  consultarIA,
}: {
  visao: "pessoal" | "casal";
  consultarIA: (pedido: Record<string, unknown>) => Promise<string>;
}) {
  const [pergunta, setPergunta] = useState("");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function pedir(pedido: Record<string, unknown>) {
    setErro("");
    setTexto("");
    setCarregando(true);
    try {
      setTexto(await consultarIA(pedido));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao consultar a IA.");
    } finally {
      setCarregando(false);
    }
  }

  function perguntar(ev: React.FormEvent) {
    ev.preventDefault();
    if (pergunta.trim().length < 3) return setErro("Escreva uma pergunta com pelo menos 3 letras.");
    pedir({ modo: "pergunta", pergunta: pergunta.trim() });
  }

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">🤖 Assistente inteligente</h2>
        <Dica titulo="Como funciona">
          <p>A IA (Gemini) lê os números deste painel e do mês selecionado e dá sugestões práticas.</p>
          <p>Ela recebe só valores e categorias, sem nomes nem e-mails. No plano gratuito, o Google pode usar o conteúdo enviado para melhorar seus produtos.</p>
          <p>As sugestões são apoio, não aconselhamento financeiro profissional.</p>
        </Dica>
      </div>

      <button
        type="button"
        disabled={carregando}
        onClick={() => pedir({ modo: "analise" })}
        className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary"
      >
        {visao === "casal" ? "Analisar o mês do casal" : "Analisar meu mês"}
      </button>

      <form onSubmit={perguntar} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          className="w-full flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm"
          placeholder="Pergunte algo sobre suas finanças..."
          maxLength={400}
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          aria-label="Pergunta para a IA"
        />
        <button type="submit" disabled={carregando} className="rounded-full border border-strong px-5 py-2 text-sm font-medium text-strong">
          Perguntar
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-2">
        {PERGUNTAS[visao].map((p) => (
          <button
            key={p}
            type="button"
            disabled={carregando}
            onClick={() => {
              setPergunta(p);
              pedir({ modo: "pergunta", pergunta: p });
            }}
            className="rounded-full bg-muted px-3 py-1 text-xs text-subtle"
          >
            {p}
          </button>
        ))}
      </div>

      {carregando && <p className="animar-entrada mt-4 text-sm text-subtle">Analisando seus números...</p>}
      {texto && <p className="animar-entrada mt-4 whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-relaxed">{texto}</p>}
      {erro && <p className="mt-4 text-sm text-danger">{erro}</p>}
    </section>
  );
}
