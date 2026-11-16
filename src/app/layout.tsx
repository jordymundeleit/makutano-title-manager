import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap" });
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Makutano Mining Title Manager — Cadastre minier RDC",
  description: "Portail de gestion numérique des titres miniers et cadastre SIG interactif de la RDC.",
};
export const viewport: Viewport = { themeColor: "#121212", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
