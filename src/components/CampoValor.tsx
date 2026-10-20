"use client";

/**
 * Máscara de moeda: só os números importam e os dois últimos são os centavos.
 * Digitar 45000 mostra 450,00; digitar 1234567 mostra 12.345,67.
 * O texto devolvido ("12.345,67") é lido normalmente por parseValor.
 */
export function mascararValor(texto: string): string {
  const digitos = texto.replace(/\D/g, "").replace(/^0+/, "").slice(0, 12);
  if (!digitos) return "";
  const cheio = digitos.padStart(3, "0");
  const inteiro = cheio.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${inteiro},${cheio.slice(-2)}`;
}

export function CampoValor({
  valor,
  onChange,
  placeholder = "0,00",
  rotulo,
  className = "",
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rotulo: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle">
        R$
      </span>
      <input
        className="w-full rounded-lg border border-line bg-background py-2 pl-10 pr-3"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        aria-label={rotulo}
        value={valor}
        onChange={(e) => onChange(mascararValor(e.target.value))}
      />
    </div>
  );
}
