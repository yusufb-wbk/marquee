export function SearchForm({ query }: { query: string }) {
  return (
    <form
      action="/"
      method="get"
      role="search"
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <label className="grid w-full gap-2 text-sm font-medium" htmlFor="q">
        Show or movie
        <input
          id="q"
          name="q"
          defaultValue={query}
          placeholder="Breaking Bad"
          required
          maxLength={120}
          enterKeyHint="search"
          className="h-12 rounded-xl border border-line bg-card px-4 text-base font-normal text-foreground placeholder:text-muted"
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 text-base font-semibold text-accent-ink"
      >
        Search
      </button>
    </form>
  );
}
