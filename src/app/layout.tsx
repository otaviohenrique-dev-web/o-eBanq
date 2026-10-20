import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import FundoAnimado from "@/components/FundoAnimado";
import Rodape from "@/components/Rodape";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// O WhatsApp exige URL absoluta para a imagem do card; ajuste NEXT_PUBLIC_SITE_URL se o endereço mudar.
const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://o-ebanq.onrender.com";
const titulo = "o-ebanq";
const descricao = "Finanças a dois, com clareza e segurança: orçamento 50/30/20, dashboard do casal e análise de compras.";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: titulo,
  description: descricao,
  applicationName: titulo,
  openGraph: {
    title: titulo,
    description: descricao,
    url: "/",
    siteName: titulo,
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: titulo,
    description: descricao,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

// Aplica o tema salvo (ou o do sistema) antes da primeira pintura, evitando o "flash" claro.
const temaInicial = `try{var t=localStorage.getItem("tema");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaInicial }} />
      </head>
      <body className="min-h-full flex flex-col">
        <FundoAnimado />
        {children}
        <Rodape />
      </body>
    </html>
  );
}
