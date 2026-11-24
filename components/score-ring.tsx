import { scoreColor } from "@/lib/ratings";

/** A ring filled to the score, coloured by its quarter (0–24, 25–49, 50–74, 75–100). */
export function ScoreRing({ score, size }: { score: number; size: "sm" | "lg" }) {
  const angle = Math.round((Math.min(100, Math.max(0, score)) / 100) * 360);
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full ${size === "lg" ? "size-10" : "size-4"}`}
      style={{ background: `conic-gradient(${scoreColor(score)} ${angle}deg, var(--line) 0deg)` }}
    >
      <span className={`rounded-full bg-card ${size === "lg" ? "size-7" : "size-2"}`} />
    </span>
  );
}
