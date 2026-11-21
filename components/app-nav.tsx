"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/up-next", label: "Next" },
  { href: "/upcoming", label: "Soon" },
  { href: "/", label: "Search" },
  { href: "/watched", label: "Watched" },
  { href: "/discover", label: "Discover" },
  { href: "/stats", label: "Stats" },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-background"
    >
      <ul className="mx-auto flex w-full max-w-3xl gap-1 px-2 pb-2">
        {LINKS.map((link) => {
          const current = isCurrent(pathname, link.href);
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={
                  current
                    ? "inline-flex h-14 w-full items-center justify-center rounded-xl bg-card text-xs font-semibold text-accent sm:text-sm"
                    : "inline-flex h-14 w-full items-center justify-center rounded-xl text-xs font-semibold text-muted sm:text-sm"
                }
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
