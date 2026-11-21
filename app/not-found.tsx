import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">That title is not on TMDB</h1>
      <p className="text-muted">
        The link may be wrong, or TMDB no longer lists it.
      </p>
      <Link
        href="/"
        className="inline-flex h-12 w-fit items-center justify-center rounded-xl bg-accent px-5 font-semibold text-accent-ink"
      >
        Back to search
      </Link>
    </div>
  );
}
