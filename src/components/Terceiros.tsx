"use client";

import { useState } from "react";
import { brl, hoje, parseValor, rotuloMes, type Conta, type DividaTerceiro, type Terceiro } from "@/lib/finance";
import { Dica } from "./Ajuda";
import { CampoValor, mascararValor } from "./CampoValor";
import { SeletorConta } from "./Contas";
import { campo, Modal } from "./Forms";

const dataBR = (d: string) => d.split("-").reverse().join("/");

function resumoTexto(d: DividaTerceiro, mes: string) {
  const linhas = d.itens.map((i) => `- ${i.descricao}: ${brl(i.valor)} (vence ${dataBR(i.data)})`);
  return [
    `Olá, ${d.terceiro.nome}! Resumo do cartão em ${rotuloMes(mes)}:`,
    ...(linhas.length > 0 ? linhas : ["- nenhuma compra neste mês"]),
    `Total do mês: ${brl(d.devidoMes)}`,
    `Já repassado no mês: ${brl(d.repassadoMes)}`,
    `Em aberto (total até aqui): ${brl(d.emAberto)}`,
  ].join("\n");
}

/** Quanto cada pessoa que usa o seu cartão deve repassar neste mês e no total. */
export function CartaoEmprestadoPanel({
  dividas,
  mes,
  podeEditar,
  onRepasse,
  onExcluirRepasse,
  onEditarRepasse,
  onEditarCompra,
  onRenomear,
}: {
  dividas: DividaTerceiro[];
  mes: string;
  podeEditar: boolean;
  onRepasse: (terceiroId: string) => void;
  onExcluirRepasse: (id: string) => void;
  onEditarRepasse: (id: string) => void;
  onEditarCompra: (id: string, tipo: "parcelado" | "assinatura") => void;
  onRenomear: (id: string, nome: string) => void;
}) {
  const [copiado, setCopiado] = useState<string | null>(null);

  async function copiar(d: DividaTerceiro) {
    try {
      await navigator.clipboard.writeText(resumoTexto(d, mes));
      setCopiado(d.terceiro.id);
      setTimeout(() => setCopiado(null), 2500);
    } catch {
      window.prompt("Copie o resumo:", resumoTexto(d, mes));
    }
  }

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">🤝 Cartão emprestado</h2>
        <Dica>
          <p>Emprestou seu cartão? Ao cadastrar a compra (ou a assinatura), escreva o nome de quem vai pagar no campo &ldquo;Quem vai pagar&rdquo;.</p>
          <p>Essas compras não entram no seu orçamento nem na divisão do casal: o app soma quanto a pessoa deve repassar em cada mês.</p>
          <p>Quando ela devolver o dinheiro, registre o repasse e o valor em aberto diminui.</p>
        </Dica>
      </div>

      {dividas.length === 0 && (
        <p className="mt-3 text-sm text-subtle">
          Ninguém usa seu cartão ainda. Ao lançar uma compra a prazo ou uma assinatura, preencha &ldquo;Quem vai pagar&rdquo; com o nome da pessoa.
        </p>
      )}

      <div className="mt-3 space-y-4">
        {dividas.map((d) => (
          <div key={d.terceiro.id} className="rounded-xl bg-muted p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                🤝 {d.terceiro.nome}
                {podeEditar && (
                  <button
                    type="button"
                    aria-label={`Renomear ${d.terceiro.nome}`}
                    title="Corrigir o nome"
                    onClick={() => {
                      const novo = window.prompt("Corrigir o nome desta pessoa:", d.terceiro.nome)?.trim();
                      if (novo && novo !== d.terceiro.nome) onRenomear(d.terceiro.id, novo);
                    }}
                    className="ml-1 rounded-full px-1.5 text-xs text-subtle"
                  >
                    ✏️
                  </button>
                )}
              </p>
              <p className={`text-lg font-semibold ${d.emAberto > 0.005 ? "text-warning" : "text-primary"}`}>
                {d.emAberto > 0.005 ? `Em aberto ${brl(d.emAberto)}` : "Em dia"}
              </p>
            </div>
            <p className="mt-1 text-xs text-subtle">
              Em {rotuloMes(mes)}: deve <strong className="text-foreground">{brl(d.devidoMes)}</strong> · já repassou{" "}
              <strong className="text-foreground">{brl(d.repassadoMes)}</strong>
            </p>

            {d.itens.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {d.itens.map((i) => (
                  <li key={i.id} className="flex flex-wrap justify-between gap-x-3">
                    <span className="min-w-0 break-words">{i.descricao}</span>
                    <span className="flex items-center gap-1 text-subtle">
                      {brl(i.valor)} · vence {dataBR(i.data)}
                      {podeEditar && i.refId && (i.origem === "parcela" || i.origem === "assinatura") && (
                        <button
                          type="button"
                          aria-label={`Editar ${i.descricao}`}
                          title="Editar esta compra (data, valor, parcelas...)"
                          onClick={() => onEditarCompra(i.refId!, i.origem === "assinatura" ? "assinatura" : "parcelado")}
                          className="rounded-full px-1.5"
                        >
                          ✏️
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {d.repasses.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-line pt-2 text-xs">
                {d.repasses.slice(0, 4).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-3">
                    <span>↩️ Repasse em {dataBR(r.data)}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-primary">{brl(r.valor)}</span>
                      {podeEditar && (
                        <button type="button" aria-label="Editar repasse" title="Editar repasse" onClick={() => onEditarRepasse(r.id)} className="rounded-full px-1.5">
                          ✏️
                        </button>
                      )}
                      {podeEditar && (
                        <button type="button" aria-label="Excluir repasse" onClick={() => onExcluirRepasse(r.id)} className="rounded-full px-1.5 text-subtle hover:text-danger">
                          ✕
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {podeEditar && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => onRepasse(d.terceiro.id)} className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-on-primary">
                  ↩️ Registrar repasse
                </button>
                <button type="button" onClick={() => copiar(d)} className="rounded-full border border-line px-4 py-1.5 text-xs text-subtle">
                  {copiado === d.terceiro.id ? "✓ Copiado!" : "📋 Copiar resumo para enviar"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Registra dinheiro que uma pessoa devolveu por ter usado o seu cartão. */
export function FormRepasse({
  terceiro,
  emAberto,
  contas,
  inicial,
  onSalvar,
  onFechar,
}: {
  terceiro: Terceiro;
  emAberto: number;
  contas: Conta[];
  /** Preenchido ao editar um repasse já registrado. */
  inicial?: { valor: number; data: string; contaId: string | null };
  onSalvar: (valor: number, data: string, contaId: string | null) => Promise<string | null>;
  onFechar: () => void;
}) {
  const [valor, setValor] = useState(inicial ? mascararValor(String(Math.round(inicial.valor * 100))) : "");
  const [data, setData] = useState(inicial?.data ?? hoje());
  const [contaId, setContaId] = useState<string | null>(inicial?.contaId ?? null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const v = parseValor(valor);
    if (!(v > 0)) return setErro("Informe um valor maior que zero.");
    if (!data) return setErro("Informe a data.");
    setSalvando(true);
    const falha = await onSalvar(v, data, contaId);
    setSalvando(false);
    if (falha) setErro(falha);
    else onFechar();
  }

  return (
    <Modal titulo={`${inicial ? "Editar repasse" : "Repasse"} de ${terceiro.nome}`} onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-3">
        <p className="text-xs text-subtle">
          Registre o dinheiro que {terceiro.nome} devolveu. O valor em aberto diminui e, se você escolher o banco, o saldo dele aumenta. Não conta como renda.
        </p>
        {!inicial && emAberto > 0.005 && (
          <button type="button" onClick={() => setValor(emAberto.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, "."))} className="rounded-full border border-line px-3 py-1.5 text-xs text-subtle">
            Preencher com o valor em aberto ({brl(emAberto)})
          </button>
        )}
        <CampoValor rotulo="Valor repassado" valor={valor} onChange={setValor} />
        <label className="block text-sm text-subtle">
          Data do repasse
          <input className={`${campo} mt-1`} type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
        <SeletorConta contas={contas} valor={contaId} onChange={setContaId} />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button type="submit" disabled={salvando} className="w-full rounded-full bg-primary px-6 py-3 font-medium text-on-primary">
          {salvando ? "Salvando..." : inicial ? "Salvar alterações" : "Registrar repasse"}
        </button>
      </form>
    </Modal>
  );
}
