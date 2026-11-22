import Image from "next/image";

/**
 * The credit TMDB's API terms ask for. It lives at the bottom of Profile,
 * not on every page.
 */
export function TmdbAttribution() {
  return (
    <div className="grid justify-items-center gap-2 opacity-80">
      <a
        href="https://www.themoviedb.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit rounded-md bg-white px-2 py-1"
      >
        <Image
          src="/tmdb-logo.svg"
          alt="The Movie Database"
          width={96}
          height={12}
          unoptimized
        />
      </a>
      <p className="max-w-sm text-center text-xs leading-5 text-muted">
        This product uses the TMDB API but is not endorsed or certified by
        TMDB.
      </p>
    </div>
  );
}
