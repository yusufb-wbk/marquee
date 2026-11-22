"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BookmarkIcon, CompassIcon, PlayIcon, SearchIcon } from "@/components/icons";

const LINKS = [
  { href: "/up-next", label: "Next", Icon: PlayIcon },
  { href: "/", label: "Search", Icon: SearchIcon },
  { href: "/watchlist", label: "Watchlist", Icon: BookmarkIcon },
  { href: "/discover", label: "Discover", Icon: CompassIcon },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/up-next") {
    return pathname === "/up-next" || pathname === "/upcoming";
  }
  if (href === "/watchlist") {
    return pathname === "/watchlist";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex w-full max-w-3xl gap-1 px-2 py-1.5">
        {LINKS.map((link) => {
          const current = isCurrent(pathname, link.href);
          const Icon = link.Icon;
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={
                  current
                    ? "grid min-h-[4.75rem] w-full content-center justify-items-center gap-1 rounded-2xl bg-card text-accent"
                    : "grid min-h-[4.75rem] w-full content-center justify-items-center gap-1 rounded-2xl text-muted"
                }
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm font-semibold leading-none">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
