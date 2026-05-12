import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";

/** Sin `next/font/google`: el build no debe hacer fetch a Google Fonts (CI/sin red). Ver `:root` en `globals.css`. */

export const metadata: Metadata = {
  title: {
    default: "FlowStore | POS",
    template: "%s | POS",
  },
  description: "PWA POS para Flow Store 2",
  manifest: "/manifest.json",
};

/** Solo en build/SSR; no usar `process` dentro del string del `<script>` (en el browser no existe). */
const registerServiceWorkerInProduction = process.env.NODE_ENV === "production";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
      <Script id="sw-register" strategy="afterInteractive">
        {`if ('serviceWorker' in navigator && ${registerServiceWorkerInProduction}) {
  navigator.serviceWorker.register('/sw.js');
}`}
      </Script>
    </html>
  );
}
