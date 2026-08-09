import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import "./globals.css";

const bodyFont = localFont({
  src: "./fonts/inter-latin-variable.woff2",
  variable: "--font-body",
  display: "swap",
  style: "normal",
  weight: "400 800",
});

const brandFont = localFont({
  src: "./fonts/hanken-grotesk-latin-variable.woff2",
  variable: "--font-brand",
  display: "swap",
  style: "normal",
  weight: "400 800",
});

export const metadata: Metadata = {
  title: "NOVA-301 Study",
  description: "Learn about the fictional NOVA-301 clinical research study.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${brandFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
