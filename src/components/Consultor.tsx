"use client";

import { useEffect, useRef, useState } from "react";
import { MarcaIA } from "./Marca";

type Escopo = "pessoal" | "casal";
type Msg = { de: "voce" | "ia" | "erro"; texto: string };

const SUGESTOES: Record<Escopo, string[]> = {
  pessoal: ["Onde posso economizar este mês?", "Qual a melhor estratégia para pagar minhas parcelas?", "Como organizar minha renda que varia?"],
  casal: ["Estamos dividindo bem os gastos?", "Qual a melhor estratégia para pagar nossas parcelas?", "Dá para guardar mais como casal?"],
};

/**
 * Consultor estratégico (Gemini): botão flutuante no canto da tela que abre um chat.
 * Cada visão (pessoal ou casal) mantém a própria conversa enquanto a página estiver aberta.
 */
export default function Consultor({
  visao,
  rotuloVisao,
  consultarIA,
}: {
  visao: Escopo;
  rotuloVisao: string;
  consultarIA: (pedido: Record<string, unknown>) => Promise<string>;
}) {
  const [aberto, setAberto] = useState(false);
  const [historico, setHistorico] = useState<Record<Escopo, Msg[]>>({ pessoal: [], casal: [] });
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const mensagens = historico[visao];

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens.length, carregando, aberto]);

  const adicionar = (escopo: Escopo, m: Msg) => setHistorico((h) => ({ ...h, [escopo]: [...h[escopo], m] }));

  async function enviar(textoUsuario: string, pedido: Record<string, unknown>) {
    if (carregando) return;
    const escopo = visao;
    adicionar(escopo, { de: "voce", texto: textoUsuario });
    setCarregando(true);
    try {
      adicionar(escopo, { de: "ia", texto: await consultarIA(pedido) });
    } catch (e) {
      adicionar(escopo, { de: "erro", texto: e instanceof Error ? e.message : "Falha ao consultar a IA." });
    } finally {
      setCarregando(false);
    }
  }

  function perguntar(ev: React.FormEvent) {
    ev.preventDefault();
    const texto = pergunta.trim();
    if (texto.length < 3) return;
    setPergunta("");
    enviar(texto, { modo: "pergunta", pergunta: texto });
  }

  const analisar = () => enviar(visao === "casal" ? "Analisar o mês do casal" : "Analisar meu mês", { modo: "analise" });

  return (
    <>
      {aberto && (
        <section
          role="dialog"
          aria-label="Consultor o-ebanq"
          className="animar-entrada fixed inset-x-3 bottom-3 z-30 flex h-[75dvh] max-h-[40rem] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-5 sm:h-[34rem] sm:w-[26rem]"
        >
          <header className="flex items-center gap-3 bg-header px-4 py-3 text-white">
            <MarcaIA size={38} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">Consultor o-ebanq</p>
              <p className="truncate text-xs text-white/70">IA estratégica · {rotuloVisao}</p>
            </div>
            <button type="button" aria-label="Fechar consultor" onClick={() => setAberto(false)} className="rounded-full px-2 py-1 text-white/80">
              ✕
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
            {mensagens.length === 0 && (
              <div className="space-y-3">
                <p className="rounded-2xl rounded-tl-sm bg-muted p-3">
                  Olá! Eu leio os números do mês selecionado e sugiro caminhos práticos. Escolha uma opção ou pergunte o que quiser.
                </p>
                <button type="button" onClick={analisar} disabled={carregando} className="w-full rounded-full bg-primary px-4 py-2.5 font-medium text-on-primary">
                  {visao === "casal" ? "Analisar o mês do casal" : "Analisar meu mês"}
                </button>
                <div className="flex flex-wrap gap-2">
                  {SUGESTOES[visao].map((s) => (
                    <button key={s} type="button" disabled={carregando} onClick={() => enviar(s, { modo: "pergunta", pergunta: s })} className="rounded-full bg-muted px-3 py-1.5 text-left text-xs text-subtle">
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-subtle">
                  Privacidade: a IA recebe só valores e categorias, sem nomes nem e-mails. No plano gratuito, o Google pode usar o conteúdo enviado para melhorar seus produtos. As respostas são apoio, não aconselhamento financeiro profissional.
                </p>
              </div>
            )}

            {mensagens.map((m, i) => (
              <div key={i} className={`flex ${m.de === "voce" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`animar-entrada max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-relaxed ${
                    m.de === "voce"
                      ? "rounded-tr-sm bg-primary text-on-primary"
                      : m.de === "erro"
                        ? "rounded-tl-sm bg-danger/15 text-danger"
                        : "rounded-tl-sm bg-muted"
                  }`}
                >
                  {m.texto}
                </p>
              </div>
            ))}

            {carregando && (
              <p className="flex items-center gap-2 text-subtle" aria-live="polite">
                <span aria-hidden className="inline-flex gap-1">
                  <span className="pontinho" />
                  <span className="pontinho" style={{ animationDelay: "0.15s" }} />
                  <span className="pontinho" style={{ animationDelay: "0.3s" }} />
                </span>
                Analisando seus números...
              </p>
            )}
            <div ref={fim} />
          </div>

          {mensagens.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-2">
              <button type="button" onClick={analisar} disabled={carregando} className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs text-subtle">
                Nova análise do mês
              </button>
              {SUGESTOES[visao].slice(0, 2).map((s) => (
                <button key={s} type="button" disabled={carregando} onClick={() => enviar(s, { modo: "pergunta", pergunta: s })} className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs text-subtle">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={perguntar} className="flex gap-2 border-t border-line p-3">
            <input
              className="min-w-0 flex-1 rounded-full border border-line bg-background px-4 py-2 text-sm"
              placeholder="Pergunte sobre suas finanças..."
              maxLength={400}
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              aria-label="Pergunta para o consultor"
            />
            <button type="submit" disabled={carregando || pergunta.trim().length < 3} aria-label="Enviar" className="h-10 w-10 shrink-0 rounded-full bg-primary text-lg font-bold text-on-primary">
              ↑
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-label={aberto ? "Fechar consultor" : "Abrir consultor inteligente"}
        aria-expanded={aberto}
        title="Consultor inteligente"
        onClick={() => setAberto((a) => !a)}
        className={`consultor-fab fixed bottom-4 right-4 z-30 h-14 w-14 items-center justify-center rounded-full shadow-xl sm:bottom-5 sm:right-5 ${aberto ? "hidden sm:flex" : "flex"}`}
      >
        {aberto ? <span className="flex h-14 w-14 items-center justify-center rounded-full bg-header text-xl text-white">✕</span> : <MarcaIA size={56} />}
        {!aberto && mensagens.length === 0 && (
          <span aria-hidden className="absolute -left-1 -top-1 flex h-4 w-4 rounded-full bg-primary ring-2 ring-background" />
        )}
      </button>
    </>
  );
}
