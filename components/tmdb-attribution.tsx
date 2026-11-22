import Image from "next/image";

export function TmdbAttribution() {
  return (
    <div className="grid justify-items-center gap-3">
      <a
        href="https://www.themoviedb.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit rounded-md bg-white px-2 py-1"
      >
        <Image
          src="/tmdb-logo.svg"
          alt="The Movie Database"
          width={146}
          height={19}
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
