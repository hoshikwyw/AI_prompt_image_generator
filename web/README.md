# web

The app. See the [project README](../README.md) and [HISTORY.md](../HISTORY.md) for context.

```bash
npm install
npm run dev
```

Runs with no keys at all: the collection is a local JSON file under `.data/`, seeded on first run.

```bash
npm run supabase:check                  # is the schema really there?
npm run supabase:migrate -- --dry-run   # what would move to Supabase
npm run supabase:migrate                # move it
```

`.env.example` documents every variable. Supabase turns the local file into a shared collection;
`ADMIN_PASSPHRASE` decides who may edit it. The image-generation keys are dormant.
