"use client";

import { useRef, useState, type PointerEvent } from "react";

import {
  CheckIcon,
  ChevronLeftIcon,
  EyeOffIcon,
} from "@/components/icons";
import type { WatchIntent } from "@/lib/progress";

const PEEK = 0;
const OPEN = 76;

const primary =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold transition-[background-color,color,transform] duration-300 ease-out motion-reduce:transition-none disabled:opacity-60";
const choice =
  "inline-flex h-12 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60";
const quiet =
  "inline-flex h-12 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-60";
const watchedBar =
  "flex h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-xl bg-notice-bg px-3 text-left text-notice transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none disabled:opacity-60";

export function EpisodeActions({
  watched,
  pending,
}: {
  watched: boolean;
  pending: WatchIntent | null;
}) {
  const [open, setOpen] = useState(false);
  const [arming, setArming] = useState(false);
  const busy = pending !== null;

  if (watched) {
    return <WatchedRow pending={pending} />;
  }

  function showChoices() {
    if (reduceMotion()) {
      setOpen(true);
      return;
    }
    setArming(true);
    window.setTimeout(() => {
      setOpen(true);
    }, 220);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={showChoices}
        className={
          arming
            ? `${primary} scale-[0.98] border-transparent bg-notice-bg text-notice`
            : primary
        }
      >
        <CheckIcon className={`h-5 w-5 transition-transform duration-300 ${arming ? "scale-125" : ""}`} />
        Mark as watched
      </button>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button type="submit" name="intent" value="watch" disabled={busy} className={choice}>
        {pending === "watch" ? "Saving…" : "Just this episode"}
      </button>
      <button type="submit" name="intent" value="upto" disabled={busy} className={quiet}>
        {pending === "upto" ? "Saving…" : "Watched up to here"}
      </button>
    </div>
  );
}

function reduceMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function WatchedRow({ pending }: { pending: WatchIntent | null }) {
  const [reveal, setReveal] = useState(PEEK);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef({ x: 0, y: 0, base: PEEK, tracking: false, reveal: PEEK });
  const dragged = useRef(false);
  const busy = pending !== null;
  const shown = dragging ? reveal : open ? OPEN : PEEK;

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    dragged.current = false;
    if (busy || event.pointerType === "mouse") {
      return;
    }
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      base: open ? OPEN : PEEK,
      tracking: false,
      reveal: open ? OPEN : PEEK,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (busy || event.pointerType === "mouse") {
      return;
    }
    const dx = event.clientX - gesture.current.x;
    const dy = event.clientY - gesture.current.y;
    if (!gesture.current.tracking) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        return;
      }
      if (Math.abs(dy) > Math.abs(dx)) {
        return;
      }
      gesture.current.tracking = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const next = Math.min(OPEN, Math.max(0, gesture.current.base - dx));
    gesture.current.reveal = next;
    setReveal(next);
  }

  function onPointerUp() {
    if (!gesture.current.tracking) {
      return;
    }
    const nextOpen = gesture.current.reveal > OPEN / 2;
    dragged.current = true;
    gesture.current.tracking = false;
    setDragging(false);
    setOpen(nextOpen);
    setReveal(nextOpen ? OPEN : PEEK);
  }

  return (
    <div className="relative overflow-hidden">
      <button
        type="submit"
        name="intent"
        value="unwatch"
        disabled={busy}
        aria-label="Mark as not watched"
        onClick={(event) => {
          if (dragged.current) {
            event.preventDefault();
            dragged.current = false;
          }
        }}
        className="absolute inset-y-0 right-0 inline-flex w-[4.75rem] items-center justify-center rounded-xl border border-line text-sm font-semibold text-muted disabled:opacity-60"
      >
        <EyeOffIcon className="h-6 w-6" />
      </button>
      <div
        className={`relative flex items-center gap-3 bg-background ${
          dragging ? "" : "transition-transform duration-300 ease-out motion-reduce:transition-none"
        }`}
        style={{ transform: `translateX(-${shown}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (dragged.current) {
              dragged.current = false;
              return;
            }
            setOpen((current) => !current);
          }}
          className={watchedBar}
        >
          <span className="flex items-center gap-3">
            <CheckIcon className="h-7 w-7" />
            <span className="text-base font-semibold">
              {pending === "unwatch" ? "Saving…" : "Watched"}
            </span>
          </span>
          <ChevronLeftIcon className={`h-5 w-5 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  );
}
