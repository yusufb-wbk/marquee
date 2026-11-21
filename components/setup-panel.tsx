import { Message } from "@/components/message";

export function SetupPanel() {
  return (
    <div className="grid gap-4">
      <Message tone="notice" title="Add your keys to sign in and search">
        <p>
          Marquee keeps the TMDB key and the Supabase publishable key on the
          server. Copy <code>.env.example</code> to <code>.env.local</code>,
          fill in the values below, and restart the dev server.
        </p>
      </Message>
      <section className="grid gap-2 rounded-2xl border border-line bg-card p-4">
        <h2 className="font-display text-xl">Supabase</h2>
        <p className="text-sm leading-6 text-muted">
          Supabase stores your account. The password is checked by Supabase
          Auth, and the app keeps a signed session in a cookie. There is no
          show database yet, so there is nothing to migrate. In the next phase,
          your watch list will be rows that only you can read, enforced inside
          Postgres with row-level security.
        </p>
        <p className="text-sm leading-6">
          Set <code>SUPABASE_URL</code> and <code>SUPABASE_PUBLISHABLE_KEY</code>.
          Use the publishable or anon key. Do not use the service role key.
        </p>
      </section>
      <section className="grid gap-2 rounded-2xl border border-line bg-card p-4">
        <h2 className="font-display text-xl">TMDB</h2>
        <p className="text-sm leading-6 text-muted">
          Show and movie details come from The Movie Database. The browser
          never calls TMDB. Search results are cached for a few minutes, and
          title pages for about an hour.
        </p>
        <p className="text-sm leading-6">
          Set <code>TMDB_API_KEY</code> or <code>TMDB_READ_ACCESS_TOKEN</code>.
        </p>
      </section>
    </div>
  );
}
