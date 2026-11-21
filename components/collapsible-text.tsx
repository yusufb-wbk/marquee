"use client";

import { useLayoutEffect, useRef, useState } from "react";

export function CollapsibleText({
  text,
  className,
}: {
  text: string;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || open) {
      return;
    }
    const paragraph = node;
    function measure() {
      setOverflows(paragraph.scrollHeight > paragraph.clientHeight + 1);
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [text, open, className]);

  return (
    <div className="grid gap-1">
      <p ref={ref} className={open ? className : `line-clamp-2 ${className}`}>
        {text}
      </p>
      {overflows ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen((current) => !current);
          }}
          className="justify-self-start text-sm font-semibold text-accent"
        >
          {open ? "Less" : "More"}
        </button>
      ) : null}
    </div>
  );
}
