import type { Metadata, Viewport } from "next";
import { SessaoProvider } from "@/lib/sessao";
import "./globals.css";

// Com exportação estática o Next não prefixa o basePath nestes links.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "CRM · MBigucci",
  description: "CRM dos corretores MBigucci.",
  robots: { index: false, follow: false },
  applicationName: "CRM MBigucci",
  manifest: `${base}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${base}/icons/icon.svg`, type: "image/svg+xml" },
      { url: `${base}/icons/favicon-32.png`, sizes: "32x32", type: "image/png" },
    ],
    apple: { url: `${base}/icons/apple-touch-icon.png`, sizes: "180x180" },
  },
  appleWebApp: { capable: true, title: "CRM", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f6f2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <SessaoProvider>{children}</SessaoProvider>
      </body>
    </html>
  );
}
