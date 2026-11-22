import { StarIcon } from "@/components/icons";

export function Score({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
      <StarIcon className="h-3.5 w-3.5 text-accent" />
      {value}
    </span>
  );
}

export function audienceScore(rating: number | null): string | null {
  if (rating === null) {
    return null;
  }
  return rating.toFixed(1);
}
