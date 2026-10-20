import { brl, CATEGORIAS, ROTULO, type Categoria } from "@/lib/finance";

const COR_CATEGORIA: Record<Categoria, string> = {
  necessidade: "var(--serie-1)",
  lazer: "var(--serie-2)",
  economia: "var(--serie-3)",
};

const rotuloMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};

function Legenda({ itens }: { itens: { cor: string; nome: string; valor?: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {itens.map((i) => (
        <li key={i.nome} className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: i.cor }} />
          <span>{i.nome}</span>
          {i.valor && <span className="text-subtle">{i.valor}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Rosca: onde o dinheiro foi no mês, por categoria. */
export function Rosca({ gasto }: { gasto: Record<Categoria, number> }) {
  const total = CATEGORIAS.reduce((s, c) => s + gasto[c], 0);
  if (total <= 0) return <p className="text-sm text-subtle">Sem gastos neste mês.</p>;

  const r = 40;
  const circ = 2 * Math.PI * r;
  const visiveis = CATEGORIAS.filter((c) => gasto[c] > 0);
  const inicios = visiveis.map((_, i) => visiveis.slice(0, i).reduce((s, c) => s + (gasto[c] / total) * circ, 0));
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 100 100" className="h-40 w-40 -rotate-90" role="img" aria-label="Gastos por categoria">
        {visiveis.map((c, i) => {
          const parte = (gasto[c] / total) * circ;
          return (
            <circle
              key={c}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={COR_CATEGORIA[c]}
              strokeWidth="14"
              strokeDasharray={`${Math.max(parte - 2, 0)} ${circ}`}
              strokeDashoffset={-inicios[i]}
            >
              <title>{`${ROTULO[c]}: ${brl(gasto[c])} (${Math.round((gasto[c] / total) * 100)}%)`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="space-y-2">
        <p className="text-sm text-subtle">Total gasto</p>
        <p className="text-xl font-semibold">{brl(total)}</p>
        <Legenda
          itens={CATEGORIAS.map((c) => ({
            cor: COR_CATEGORIA[c],
            nome: ROTULO[c],
            valor: `${brl(gasto[c])} · ${Math.round((gasto[c] / total) * 100)}%`,
          }))}
        />
      </div>
    </div>
  );
}

/** Barras agrupadas: entradas x saídas dos últimos meses. */
export function BarrasMeses({ dados }: { dados: { mes: string; entradas: number; saidas: number }[] }) {
  const max = Math.max(...dados.flatMap((d) => [d.entradas, d.saidas]), 1);
  const L = 360;
  const A = 150;
  const base = A - 20;
  const largura = L / dados.length;
  const h = (v: number) => (v / max) * (base - 8);
  return (
    <div className="space-y-3">
      <Legenda
        itens={[
          { cor: "var(--serie-1)", nome: "Entradas" },
          { cor: "var(--serie-2)", nome: "Saídas" },
        ]}
      />
      <svg viewBox={`0 0 ${L} ${A}`} className="w-full" role="img" aria-label="Entradas e saídas por mês">
        <line x1="0" x2={L} y1={base} y2={base} stroke="var(--line)" />
        {dados.map((d, i) => {
          const x = i * largura + largura / 2;
          return (
            <g key={d.mes}>
              <rect x={x - 17} y={base - h(d.entradas)} width="16" height={h(d.entradas)} rx="3" fill="var(--serie-1)">
                <title>{`${rotuloMes(d.mes)} · Entradas: ${brl(d.entradas)}`}</title>
              </rect>
              <rect x={x + 1} y={base - h(d.saidas)} width="16" height={h(d.saidas)} rx="3" fill="var(--serie-2)">
                <title>{`${rotuloMes(d.mes)} · Saídas: ${brl(d.saidas)}`}</title>
              </rect>
              <text x={x} y={A - 5} textAnchor="middle" fontSize="10" fill="var(--subtle)">
                {rotuloMes(d.mes)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Total de parcelas que vencem em cada um dos próximos meses. */
export function BarrasParcelas({ dados }: { dados: { mes: string; total: number }[] }) {
  const max = Math.max(...dados.map((d) => d.total), 1);
  const L = 360;
  const A = 130;
  const base = A - 20;
  const largura = L / dados.length;
  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="w-full" role="img" aria-label="Parcelas a pagar nos próximos meses">
      <line x1="0" x2={L} y1={base} y2={base} stroke="var(--line)" />
      {dados.map((d, i) => {
        const x = i * largura + largura / 2;
        const h = (d.total / max) * (base - 22);
        return (
          <g key={d.mes}>
            <rect x={x - 14} y={base - h} width="28" height={h} rx="3" fill="var(--serie-2)">
              <title>{`${rotuloMes(d.mes)} · Parcelas: ${brl(d.total)}`}</title>
            </rect>
            {d.total > 0 && (
              <text x={x} y={base - h - 5} textAnchor="middle" fontSize="9" fill="var(--foreground)">
                {Math.round(d.total).toLocaleString("pt-BR")}
              </text>
            )}
            <text x={x} y={A - 5} textAnchor="middle" fontSize="10" fill="var(--subtle)">
              {rotuloMes(d.mes)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Quanto cada pessoa recebeu e gastou no mês. */
export function BarrasPessoas({
  dados,
  rotulos = ["Entradas", "Saídas"],
}: {
  dados: { nome: string; entradas: number; saidas: number }[];
  rotulos?: [string, string];
}) {
  const max = Math.max(...dados.flatMap((d) => [d.entradas, d.saidas]), 1);
  return (
    <div className="space-y-4">
      <Legenda
        itens={[
          { cor: "var(--serie-1)", nome: rotulos[0] },
          { cor: "var(--serie-2)", nome: rotulos[1] },
        ]}
      />
      {dados.map((d) => (
        <div key={d.nome} className="space-y-1">
          <p className="text-sm font-medium">{d.nome}</p>
          {(
            [
              [rotulos[0], d.entradas, "var(--serie-1)"],
              [rotulos[1], d.saidas, "var(--serie-2)"],
            ] as const
          ).map(([nome, valor, cor]) => (
            <div key={nome} className="flex items-center gap-3 text-xs" title={`${d.nome} · ${nome}: ${brl(valor)}`}>
              <div className="h-3 flex-1 rounded-sm bg-muted">
                <div className="h-3 rounded-sm transition-[width] duration-500" style={{ width: `${(valor / max) * 100}%`, background: cor }} />
              </div>
              <span className="w-24 text-right text-subtle">{brl(valor)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
