"use client";

import { useState } from "react";
import { copiaEmJson, PALAVRA_RESET, podeApagar, resumoDoReset, type SelecaoReset } from "@/lib/reset";
import { campo, Modal } from "./Forms";

/**
 * Apagar os dados de quem está logado. Proteções contra clique acidental: fica escondido no menu da conta,
 * mostra exatamente o que será apagado, sugere baixar uma cópia e só libera o botão depois de digitar APAGAR
 * e marcar que entendeu que não tem volta.
 */
export function ModalReset({
  selecaoPessoal,
  selecaoTudo,
  onApagar,
  onFechar,
}: {
  selecaoPessoal: SelecaoReset;
  selecaoTudo: SelecaoReset;
  /** Devolve a mensagem de erro, ou null se deu certo. */
  onApagar: (tudo: boolean) => Promise<string | null>;
  onFechar: () => void;
}) {
  const [tudo, setTudo] = useState(false);
  const [texto, setTexto] = useState("");
  const [entendi, setEntendi] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState("");
  const [feito, setFeito] = useState(false);

  const sel = tudo ? selecaoTudo : selecaoPessoal;
  const linhas = resumoDoReset(sel);
  const liberado = podeApagar(texto, entendi, sel.total, apagando);

  function escolher(novoTudo: boolean) {
    setTudo(novoTudo);
    // Trocar a opção exige confirmar de novo.
    setTexto("");
    setEntendi(false);
    setErro("");
  }

  function baixarCopia() {
    const blob = new Blob([copiaEmJson(sel)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `o-ebanq-copia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function apagar() {
    if (!liberado) return;
    setApagando(true);
    setErro("");
    const falha = await onApagar(tudo);
    setApagando(false);
    if (falha) setErro(falha);
    else setFeito(true);
  }

  const opcao = (ativo: boolean) =>
    `w-full rounded-xl border-2 p-3 text-left text-sm ${ativo ? "border-danger bg-danger/10" : "border-line"}`;

  return (
    <Modal titulo="Apagar meus dados" onFechar={() => !apagando && onFechar()}>
      {feito ? (
        <div className="space-y-4 text-sm">
          <p className="rounded-lg bg-primary/15 p-3 font-medium">✅ Pronto, seus dados foram apagados.</p>
          <button type="button" onClick={onFechar} className="w-full rounded-full bg-primary px-6 py-3 font-medium text-on-primary">
            Fechar
          </button>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <p className="rounded-lg bg-danger/10 p-3">
            <strong>Atenção:</strong> apagar é <strong>definitivo</strong>. Não dá para desfazer. Os dados do seu par e o seu login não são tocados.
          </p>

          <div className="space-y-2" role="radiogroup" aria-label="O que apagar">
            <button type="button" role="radio" aria-checked={!tudo} onClick={() => escolher(false)} className={opcao(!tudo)}>
              <strong>Só meus dados pessoais</strong>
              <span className="mt-0.5 block text-xs text-subtle">
                Lançamentos, compras a prazo e assinaturas pessoais, salário, cartão emprestado e repasses. Mantém seus bancos e o que você lançou como &ldquo;do casal&rdquo;.
              </span>
            </button>
            <button type="button" role="radio" aria-checked={tudo} onClick={() => escolher(true)} className={opcao(tudo)}>
              <strong>Tudo que eu cadastrei</strong>
              <span className="mt-0.5 block text-xs text-subtle">
                Inclui também seus bancos, o que você lançou como do casal e os pagamentos de fatura que registrou. Isso muda o que seu par vê em &ldquo;Casal&rdquo;.
              </span>
            </button>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="mb-1 font-medium">Será apagado:</p>
            {linhas.length === 0 ? (
              <p className="text-subtle">Não há nada para apagar nesta opção.</p>
            ) : (
              <ul className="space-y-0.5">
                {linhas.map((l) => (
                  <li key={l.nome}>
                    <strong>{l.quantidade}</strong> {l.nome}
                  </li>
                ))}
              </ul>
            )}
            {tudo && selecaoTudo.adiantadas.length > 0 && (
              <p className="mt-2 text-xs text-subtle">Pagamentos que seu par registrou sobre compras suas que serão apagadas saem junto.</p>
            )}
          </div>

          {sel.total > 0 && (
            <>
              <button type="button" onClick={baixarCopia} className="w-full rounded-full border border-strong px-4 py-2 font-medium text-strong">
                ⬇️ Baixar uma cópia antes (recomendado)
              </button>
              <p className="-mt-2 text-xs text-subtle">É um arquivo para você guardar; o app ainda não restaura a partir dele.</p>

              <label className="block">
                <span className="text-subtle">
                  Para confirmar, digite <strong className="text-foreground">{PALAVRA_RESET}</strong>
                </span>
                <input
                  className={`${campo} mt-1`}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-label={`Digite ${PALAVRA_RESET} para confirmar`}
                />
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={entendi} onChange={(e) => setEntendi(e.target.checked)} />
                <span>Entendo que isso não pode ser desfeito.</span>
              </label>
            </>
          )}

          {erro && <p className="rounded-lg bg-danger/15 p-3 text-danger">{erro}</p>}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              disabled={!liberado}
              onClick={apagar}
              className="rounded-full bg-danger px-6 py-3 font-semibold text-white"
            >
              {apagando ? "Apagando..." : "Apagar definitivamente"}
            </button>
            <button type="button" disabled={apagando} onClick={onFechar} className="rounded-full border border-line px-6 py-3 font-medium">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
