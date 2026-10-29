import type { Metadata, Viewport } from "next";
import { SessaoProvider } from "@/lib/sessao";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM · MBigucci",
  description: "CRM dos corretores MBigucci.",
  robots: { index: false, follow: false },
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
