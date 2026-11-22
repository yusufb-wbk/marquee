"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PersonIcon, PlayIcon, SearchIcon } from "@/components/icons";

const LINKS = [
  { href: "/up-next", label: "Next", Icon: PlayIcon },
  { href: "/", label: "Search", Icon: SearchIcon },
  { href: "/profile", label: "Profile", Icon: PersonIcon },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/" || pathname === "/discover";
  }
  if (href === "/up-next") {
    return pathname === "/up-next" || pathname === "/upcoming";
  }
  if (href === "/profile") {
    return (
      pathname === "/profile" ||
      pathname.startsWith("/profile/") ||
      pathname === "/watchlist" ||
      pathname === "/watched" ||
      pathname === "/stats"
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid w-full max-w-6xl grid-cols-3">
        {LINKS.map((link) => {
          const current = isCurrent(pathname, link.href);
          const Icon = link.Icon;
          return (
            <li key={link.href} className="min-w-0">
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={
                  current
                    ? "grid h-16 content-center justify-items-center gap-1 text-accent"
                    : "grid h-16 content-center justify-items-center gap-1 text-muted"
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
