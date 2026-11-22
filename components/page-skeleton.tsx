import type { ReactNode } from "react";

export function PageSkeleton({
  kind,
}: {
  kind: "queue" | "browse" | "detail" | "episodes" | "form" | "results";
}) {
  if (kind === "detail") {
    return (
      <Shell>
        <Block className="h-9 w-16 rounded-full" />
        <div className="flex items-start gap-4">
          <Block className="aspect-[2/3] w-28 shrink-0 rounded-xl sm:w-36" />
          <div className="grid min-w-0 flex-1 gap-3 pt-1">
            <Block className="h-8 w-4/5 rounded-lg" />
            <Block className="h-4 w-1/2 rounded-lg" />
            <Block className="h-4 w-full rounded-lg" />
            <Block className="h-4 w-3/4 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Block className="min-h-16 rounded-2xl" />
          <Block className="min-h-16 rounded-2xl" />
          <Block className="min-h-16 rounded-2xl" />
        </div>
        <EpisodeRows />
      </Shell>
    );
  }

  if (kind === "episodes") {
    return (
      <Shell>
        <EpisodeRows />
      </Shell>
    );
  }

  if (kind === "form") {
    return (
      <Shell>
        <Block className="h-10 w-48 rounded-lg" />
        <Block className="h-12 rounded-xl" />
        <Block className="h-12 rounded-xl" />
        <Block className="h-12 w-40 rounded-full" />
      </Shell>
    );
  }

  if (kind === "results") {
    return (
      <Shell>
        <CardRows buttons={false} />
      </Shell>
    );
  }

  if (kind === "browse") {
    return (
      <Shell>
        <Block className="h-10 w-40 rounded-lg" />
        <Block className="h-5 w-2/3 rounded-lg" />
        <div className="grid grid-cols-3 gap-2">
          <Block className="h-20 rounded-2xl" />
          <Block className="h-20 rounded-2xl" />
          <Block className="h-20 rounded-2xl" />
        </div>
        <CardRows buttons={false} />
      </Shell>
    );
  }

  return (
    <Shell>
      <Block className="h-10 w-36 rounded-lg" />
      <CardRows buttons />
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div aria-busy="true" className="grid gap-6">
      <p className="sr-only">Loading</p>
      {children}
    </div>
  );
}

function CardRows({ buttons }: { buttons: boolean }) {
  return (
    <div className="grid gap-3">
      {["one", "two", "three"].map((key) => (
        <div key={key} className="grid gap-2">
          <div className="flex gap-3 rounded-2xl border border-line bg-card p-3">
            <Block className="aspect-[2/3] w-16 shrink-0 rounded-xl" />
            <div className="grid min-w-0 flex-1 content-center gap-2">
              <Block className="h-5 w-2/3 rounded-lg" />
              <Block className="h-4 w-1/2 rounded-lg" />
            </div>
          </div>
          {buttons ? <Block className="h-12 rounded-xl" /> : null}
        </div>
      ))}
    </div>
  );
}

function EpisodeRows() {
  return (
    <div className="grid gap-2">
      {["one", "two", "three", "four"].map((key) => (
        <Block key={key} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}

function Block({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} />;
}
