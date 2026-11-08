import type { Metadata, Viewport } from "next";
import { SessaoProvider } from "@/lib/sessao";
import { PADRAO_VENDAS, scriptAlicerce } from "@/alicerce/aparencia";
// Ordem de carga do CSS (como no Vendas, item 48): base do Tailwind → Alicerce → ajuste local.
import "./tailwind-base.css";
import "@/alicerce/tokens.css";
import "@/alicerce/bundle.css";
import "./alicerce-local.css";

// Com exportação estática o Next não prefixa o basePath nestes links.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Base360 Marketing",
  description: "Base360 Marketing.",
  robots: { index: false, follow: false },
  applicationName: "Base360",
  manifest: `${base}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${base}/icons/icon.svg`, type: "image/svg+xml" },
      { url: `${base}/icons/favicon-32.png`, sizes: "32x32", type: "image/png" },
    ],
    apple: { url: `${base}/icons/apple-touch-icon.png`, sizes: "180x180" },
  },
  appleWebApp: { capable: true, title: "Base360", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // O --fundo do tema papel do Alicerce. A ponte de alicerce/aparencia.ts troca pelo do tema em uso.
  themeColor: "#f6f5f1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme={PADRAO_VENDAS.tema} data-menu={PADRAO_VENDAS.menu} data-acao={PADRAO_VENDAS.acao} suppressHydrationWarning>
      <head>
        {/* Sem async nem defer: o MB precisa existir antes do script abaixo, que roda antes da primeira pintura. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={`${base}/alicerce/bundle.js`} />
        <script dangerouslySetInnerHTML={{ __html: scriptAlicerce }} />
      </head>
      <body>
        <SessaoProvider>{children}</SessaoProvider>
      </body>
    </html>
  );
}
