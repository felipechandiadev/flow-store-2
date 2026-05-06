import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from '@/providers/AuthProvider';
import ErrorHandlerProvider from '@/providers/ErrorHandlerProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  manifest: '/manifest.json',
  title: 'FlowStore - Panel de administración',
  description: 'Administrador de tienda Flow Store',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

/** Solo en build/SSR; no usar `process` dentro del string del `<script>` (en el browser no existe). */
const registerServiceWorkerInProduction = process.env.NODE_ENV === "production";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CL">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FlowStore - Panel de administración" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col`}>
        <AuthProvider>
          <ErrorHandlerProvider>
            {children}
          </ErrorHandlerProvider>
        </AuthProvider>
        <Script id="flowstore-register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator && ${registerServiceWorkerInProduction}) {
              navigator.serviceWorker.register('/sw.js');
            }
          `}
        </Script>
      </body>
    </html>
  );
}
