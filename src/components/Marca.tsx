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

/** Estrela de quatro pontas (faísca de IA) centrada em (cx, cy). */
const faisca = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r}Z`;

/**
 * Marca do Consultor: o escudo e a linha de ativos do o-ebanq com faíscas de IA por cima,
 * como um conselheiro estratégico que enxerga os números.
 */
export function MarcaIA({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Consultor o-ebanq">
      <defs>
        <linearGradient id="ia-fundo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e293b" />
          <stop offset="1" stopColor="#0b1120" />
        </linearGradient>
        <linearGradient id="ia-linha" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#6ee7b7" />
        </linearGradient>
        <radialGradient id="ia-brilho" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fde68a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#ia-fundo)" />
      <g transform="translate(-3 6) scale(0.9)">
        <path
          d="M32 9 L50 15 V30 C50 42 42 50 32 56 C22 50 14 42 14 30 V15 Z"
          fill="#10b981"
          fillOpacity="0.14"
          stroke="#10b981"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <polyline points="21,39 28,32 34,36 42,27" fill="none" stroke="url(#ia-linha)" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <circle cx="47" cy="17" r="13" fill="url(#ia-brilho)" />
      <path className="faisca" d={faisca(47, 17, 10)} fill="#fde68a" />
      <path className="faisca faisca-2" d={faisca(55, 31, 4.5)} fill="#a7f3d0" />
      <path className="faisca faisca-3" d={faisca(37, 7, 3.5)} fill="#a7f3d0" />
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
