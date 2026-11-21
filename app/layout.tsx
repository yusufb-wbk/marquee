import { Suspense } from "react";
import Link from "next/link";
import { Fraunces, Geist } from "next/font/google";

import { AccountMenu } from "@/components/account-menu";
import { TmdbAttribution } from "@/components/tmdb-attribution";

import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata = {
  title: {
    default: "Marquee",
    template: "%s · Marquee",
  },
  description: "Search shows and movies, then open a title to see its episodes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="grid min-h-dvh grid-rows-[auto_1fr_auto]">
          <header className="border-b border-line">
            <div className="marquee-rail" aria-hidden="true" />
            <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4">
              <Link href="/" className="font-display text-2xl tracking-tight">
                Marquee
              </Link>
              <Suspense fallback={<div className="h-11 w-24" />}>
                <AccountMenu />
              </Suspense>
            </div>
          </header>
          <main id="main" className="mx-auto w-full max-w-3xl px-4 py-6">
            {children}
          </main>
          <footer className="border-t border-line">
            <div className="mx-auto w-full max-w-3xl px-4 py-6">
              <TmdbAttribution />
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
