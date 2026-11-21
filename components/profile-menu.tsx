"use client";

import { useEffect, useId, useRef, useState } from "react";

import { PersonIcon } from "@/components/icons";

export function ProfileMenu({ email, csrf }: { email: string; csrf: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account"
        onClick={() => {
          setOpen((current) => !current);
        }}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line"
      >
        <PersonIcon className="h-5 w-5" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute top-full right-0 z-20 grid w-56 gap-2 pt-2"
        >
          <div className="grid gap-2 rounded-2xl border border-line bg-card p-3 shadow-lg">
            <p className="truncate px-2 text-sm text-muted" title={email}>
              {email}
            </p>
            <form action="/auth/signout" method="post">
              {csrf.length > 0 ? <input type="hidden" name="csrf" value={csrf} /> : null}
              <button
                type="submit"
                role="menuitem"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-line px-3 text-sm font-semibold"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
