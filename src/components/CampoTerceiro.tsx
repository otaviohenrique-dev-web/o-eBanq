"use client";

import type { Terceiro } from "@/lib/finance";

/**
 * "Quem vai pagar esta compra?": vazio = é sua. Com um nome, é uma compra de outra pessoa no seu cartão,
 * que não entra no seu orçamento e vira um valor a receber (repasse).
 */
export function CampoTerceiro({
  terceiros,
  valor,
  onChange,
}: {
  terceiros: Terceiro[];
  valor: string;
  onChange: (nome: string) => void;
}) {
  const atual = valor.trim().toLowerCase();
  const chip = (ativo: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm ${ativo ? "border-strong bg-strong text-background" : "border-line"}`;
  return (
    <div className="space-y-2">
      <p className="text-sm text-subtle">Quem vai pagar esta compra?</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Quem vai pagar">
        <button type="button" role="radio" aria-checked={atual === ""} onClick={() => onChange("")} className={chip(atual === "")}>
          Eu / nós
        </button>
        {terceiros.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={atual === t.nome.toLowerCase()}
            onClick={() => onChange(t.nome)}
            className={chip(atual === t.nome.toLowerCase())}
          >
            🤝 {t.nome}
          </button>
        ))}
      </div>
      <input
        className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
        placeholder="Emprestou o cartão? Digite o nome de quem vai pagar"
        maxLength={40}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Nome de quem vai pagar"
      />
      {atual !== "" && (
        <p className="animar-entrada rounded-lg bg-primary/10 p-3 text-xs">
          🤝 Esta compra é de <strong>{valor.trim()}</strong>: não entra no seu orçamento nem na divisão do casal. O app soma quanto{" "}
          {valor.trim()} deve repassar a você em &ldquo;Cartão emprestado&rdquo;.
        </p>
      )}
    </div>
  );
}
