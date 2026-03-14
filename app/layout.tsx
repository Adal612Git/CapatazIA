import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "@lotosui/claude-arm/styles.css";
import "./globals.css";

const bodyFont = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
});

const displayFont = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Capataz.ai | Control Automotriz",
  description: "Capataz.ai para agencias automotrices: pipeline comercial, campana, post-venta y visibilidad multisucursal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
