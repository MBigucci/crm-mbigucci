import type { Metadata, Viewport } from "next";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SessaoProvider } from "@/lib/sessao";
import { PADRAO_VENDAS, scriptAlicerce } from "@/lib/aparencia";
// Ordem de carga do CSS (item 48): base do Tailwind → Alicerce → CSS do app → ajuste local.
import "./tailwind-base.css";
import "@/alicerce/tokens.css";
import "@/alicerce/bundle.css";
import "./globals.css";
import "./alicerce-local.css";

// Com exportação estática o Next não prefixa o basePath nestes links.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
// Lido no build estático, sem cópia divergente do runtime do portal. O cwd é crm/ no build normal e
// crm/.visual-preview/ no preview isolado, por isso procura um nível acima também.
const fonteApp = ["../portal/app.fonte.js", "../../portal/app.fonte.js"]
  .map((p) => resolve(process.cwd(), p))
  .find((p) => existsSync(p));
if (!fonteApp) throw new Error("portal/app.fonte.js não encontrado: o build do Vendas precisa da pasta portal/ do repositório.");
const scriptApp = readFileSync(fonteApp, "utf8") +
  "\nBase360App.abrirVendas().catch(console.warn);";

export const metadata: Metadata = {
  title: "Base360",
  description: "Base360 Vendas, o sistema dos corretores MBigucci.",
  robots: { index: false, follow: false },
  applicationName: "Base360",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
  },
  appleWebApp: { capable: true, title: "Base360", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // O --fundo do tema papel do Alicerce. src/lib/aparencia.ts acompanha o tema em uso.
  themeColor: "#f6f5f1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      data-theme={PADRAO_VENDAS.tema}
      data-menu={PADRAO_VENDAS.menu}
      data-acao={PADRAO_VENDAS.acao}
      suppressHydrationWarning
    >
      <head>
        {/* Sem async nem defer: o MB precisa existir antes do script abaixo, que roda antes da primeira pintura. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={`${base}/alicerce/bundle.js`} />
        <script dangerouslySetInnerHTML={{ __html: scriptAlicerce }} />
        <script dangerouslySetInnerHTML={{ __html: scriptApp }} />
      </head>
      <body>
        <SessaoProvider>{children}</SessaoProvider>
      </body>
    </html>
  );
}
