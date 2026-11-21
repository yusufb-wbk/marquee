import type { ReactNode } from "react";

export function Message({
  tone,
  title,
  children,
}: {
  tone: "error" | "notice";
  title: string;
  children?: ReactNode;
}) {
  const toneClass =
    tone === "error"
      ? "border-danger/40 bg-danger-bg"
      : "border-notice/40 bg-notice-bg";
  const titleClass = tone === "error" ? "text-danger" : "text-notice";

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`grid gap-1 rounded-2xl border px-4 py-3 ${toneClass}`}
    >
      <p className={`font-semibold ${titleClass}`}>{title}</p>
      {children ? <div className="text-sm leading-6 text-foreground">{children}</div> : null}
    </div>
  );
}
