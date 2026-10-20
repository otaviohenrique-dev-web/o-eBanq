// Candles fixos (sem Math.random) para a renderização do servidor e do navegador coincidirem.
const candles = [
  { x: 6, h: 46, w: 10, alta: true, dur: 34, atraso: 0 },
  { x: 16, h: 30, w: 8, alta: false, dur: 28, atraso: -9 },
  { x: 27, h: 58, w: 10, alta: true, dur: 38, atraso: -20 },
  { x: 38, h: 36, w: 8, alta: true, dur: 30, atraso: -4 },
  { x: 49, h: 50, w: 10, alta: false, dur: 36, atraso: -15 },
  { x: 60, h: 28, w: 8, alta: true, dur: 32, atraso: -26 },
  { x: 71, h: 54, w: 10, alta: true, dur: 40, atraso: -11 },
  { x: 82, h: 34, w: 8, alta: false, dur: 29, atraso: -22 },
  { x: 92, h: 48, w: 10, alta: true, dur: 35, atraso: -7 },
];

/** Fundo sutil: grade, linhas de trade que se desenham e candles subindo devagar. */
export default function FundoAnimado() {
  return (
    <div aria-hidden className="fundo-animado pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="fundo-grade absolute inset-0" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="none">
        <path
          className="fundo-linha"
          d="M0 470 L90 430 L170 450 L260 360 L350 385 L450 290 L540 320 L640 220 L730 250 L830 150 L920 175 L1000 100"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="fundo-linha fundo-linha-2"
          d="M0 540 L110 505 L200 520 L300 450 L400 470 L500 400 L610 420 L700 340 L810 360 L900 290 L1000 250"
          fill="none"
          stroke="var(--serie-1)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {candles.map((c) => (
        <span
          key={c.x}
          className="fundo-candle"
          style={{
            left: `${c.x}%`,
            width: c.w,
            height: c.h,
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.atraso}s`,
            color: c.alta ? "var(--primary)" : "var(--danger)",
          }}
        />
      ))}
    </div>
  );
}
