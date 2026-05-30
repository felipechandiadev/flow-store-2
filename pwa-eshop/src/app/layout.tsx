import type { Metadata, Viewport } from "next";
import "./globals.css";

const THEME_COLOR = "#002B59";

export const metadata: Metadata = {
  title: { default: "KaiStore eShop", template: "%s | KaiStore eShop" },
  description: "Tienda en línea KaiStore",
  applicationName: "KaiStore eShop",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: THEME_COLOR,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
