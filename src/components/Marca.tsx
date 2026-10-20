/**
 * Marca do o-ebanq: um escudo (segurança) com uma linha de ativos em alta (investimento).
 * Usa cores fixas porque também é renderizada fora do navegador (favicon e card de compartilhamento).
 */
export function Marca({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="o-ebanq">
      <defs>
        <linearGradient id="marca-fundo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e293b" />
          <stop offset="1" stopColor="#0b1120" />
        </linearGradient>
        <linearGradient id="marca-linha" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#6ee7b7" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#marca-fundo)" />
      <path
        d="M32 9 L50 15 V30 C50 42 42 50 32 56 C22 50 14 42 14 30 V15 Z"
        fill="#10b981"
        fillOpacity="0.14"
        stroke="#10b981"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <polyline points="21,39 28,32 34,36 43,24" fill="none" stroke="url(#marca-linha)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="43" cy="24" r="3.4" fill="#6ee7b7" />
    </svg>
  );
}

export function Logo({ tamanho = 36, texto = true }: { tamanho?: number; texto?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Marca size={tamanho} />
      {texto && <span className="text-xl font-semibold tracking-tight">o-ebanq</span>}
    </span>
  );
}
