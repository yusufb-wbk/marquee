import { Suspense } from "react";
import Link from "next/link";
import { Fraunces, Geist } from "next/font/google";

import { PwaRegister } from "@/components/pwa-register";
import { SignedInNav } from "@/components/signed-in-nav";
import { ThemeToggle } from "@/components/theme-toggle";
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

const themeScript = `(() => {
  try {
    const match = document.cookie.match(/(?:^|; )theme=(light|dark)(?:;|$)/);
    if (match) document.documentElement.dataset.theme = match[1];
  } catch {
    /* keep the dark theme */
  }
})();`;

export const metadata = {
  title: {
    default: "Marquee",
    template: "%s · Marquee",
  },
  description: "Track shows and movies, mark what you have watched, and see what is next.",
  applicationName: "Marquee",
  appleWebApp: {
    capable: true,
    title: "Marquee",
    statusBarStyle: "black-translucent" as const,
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <div className="grid min-h-dvh grid-rows-[auto_1fr_auto] pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
          <header className="border-b border-line">
            <div className="marquee-rail" aria-hidden="true" />
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
              <Link href="/up-next" className="font-display text-2xl tracking-tight">
                Marquee
              </Link>
              <ThemeToggle />
            </div>
          </header>
          <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
            {children}
          </main>
          <footer className="border-t border-line">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
              <TmdbAttribution />
            </div>
          </footer>
        </div>
        <Suspense fallback={null}>
          <SignedInNav />
        </Suspense>
        <PwaRegister />
      </body>
    </html>
  );
}
