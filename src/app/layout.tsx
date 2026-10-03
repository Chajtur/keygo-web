import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KeyGo | Compra en Estados Unidos, recibe en Honduras",
  description: "Casillero en Miami y envíos a Honduras con seguimiento por paquete.",
  applicationName: "KeyGo Cargo Express",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/keygo-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/keygo-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/icons/keygo-192.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
