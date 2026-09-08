# Supabase

The backend: prompts, sample images, and the storage bucket the images live in.

```
migrations/20260908000000_init.sql   tables, RLS, copy counter, storage bucket
```

## Apply it

Either path works; the dashboard is the shorter one.

**Dashboard** — SQL Editor → New query → paste `migrations/20260908000000_init.sql` → Run.
It is safe to run again if you are unsure whether it took.

**CLI** — needs your database password:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

## Point the app at it

Copy the API values from **Project Settings → API** into `web/.env.local`:

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

Then check the whole thing end to end:

```bash
cd web && npm run supabase:check
```

It reads both tables with the anon key, proves an anonymous INSERT is *rejected*, and confirms the
bucket and the copy-counter function exist. It never prints a key.

Both are read by the server at startup. There is no `NEXT_PUBLIC_` prefix on purpose: nothing in
the browser talks to Supabase, and a `NEXT_PUBLIC_` value is inlined at build time, which would
bake the choice of backend into the bundle.

## How access works

Read is public. Both tables have a single `select` policy for `anon` and `authenticated`, and
**no** insert, update or delete policy — so anything holding the anon key can only read.

Every write goes through a server route using the `service_role` key, which bypasses RLS. That key
is the whole security boundary: it is server-only, never reaches a browser, and the routes that use
it sit behind the admin gate. If it leaks, rotate it in the dashboard.

The `prompt-samples` bucket is public so a card can use a plain image URL with no signed-URL round
trip. Uploads and deletes have no storage policy, which likewise leaves them to `service_role`.

## Notes

- **Timestamps are set by the app, not a trigger.** An import has to be able to preserve the
  original `created_at`, which a `now()` trigger would overwrite.
- **`increment_prompt_copies()` is atomic**, so two people copying the same prompt at the same
  moment cannot lose a count the way a read-modify-write would.
- The `id` is the slug, checked to be `^[a-z0-9-]+$` and never `new` or `edit` — those are page
  routes, and a prompt holding one would be unreachable. Kept in step with `RESERVED_IDS` in
  `web/lib/store.ts`.
