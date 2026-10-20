import { ImageResponse } from "next/og";
import { Marca } from "@/components/Marca";

export const alt = "o-ebanq: finanças a dois, com clareza e segurança";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const chips = ["Regra 50/30/20", "Dashboard do casal", "Posso comprar?"];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #0b1120 0%, #0f172a 55%, #12261f 100%)",
          color: "#f8fafc",
          padding: 72,
        }}
      >
        {/* linha de ativos em alta ao fundo */}
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", left: 0, top: 0 }}>
          <polyline
            points="0,540 130,500 230,520 360,430 470,455 600,350 720,380 850,260 960,290 1080,170 1200,120"
            fill="none"
            stroke="#10b981"
            strokeOpacity="0.35"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="0,590 160,560 300,575 440,500 580,520 700,450 840,470 980,380 1100,400 1200,330"
            fill="none"
            stroke="#3987e5"
            strokeOpacity="0.28"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {Marca({ size: 150 })}
            <div style={{ display: "flex", fontSize: 108, fontWeight: 700, letterSpacing: -3 }}>o-ebanq</div>
          </div>
          <div style={{ display: "flex", marginTop: 36, fontSize: 46, color: "#cbd5e1", maxWidth: 900 }}>
            Finanças a dois, com clareza e segurança.
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 44 }}>
            {chips.map((c) => (
              <div
                key={c}
                style={{
                  display: "flex",
                  padding: "12px 26px",
                  borderRadius: 999,
                  border: "2px solid #10b981",
                  color: "#6ee7b7",
                  fontSize: 30,
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
