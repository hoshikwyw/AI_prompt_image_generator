-- Promptbook — initial schema.
--
-- Mirrors the Prompt shape in web/lib/prompt.ts. Column names are snake_case;
-- the mapping to the camelCase app type lives in web/lib/store/supabase.ts and
-- is the only place that knows about both.
--
-- Safe to run more than once: everything is IF NOT EXISTS, and policies are
-- dropped before being recreated.

-- ---------------------------------------------------------------- prompts --

create table if not exists public.prompts (
  -- The slug, generated from the title. Stable once created, so a saved link
  -- survives a rename.
  id            text primary key,
  title         text        not null,
  summary       text        not null default '',
  body          text        not null,
  notes         text        not null default '',
  category      text        not null default 'other',
  tags          text[]      not null default '{}',
  target_model  text        not null default 'any',
  source        text        not null default '',
  accent        text        not null default '',
  favorite      boolean     not null default false,
  copies        integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint prompts_id_slug check (id ~ '^[a-z0-9-]+$'),
  -- `/prompts/new` is the create form, so a prompt may not claim that slug and
  -- become unreachable. Kept in step with RESERVED_IDS in the store.
  constraint prompts_id_not_reserved check (id not in ('new', 'edit')),
  constraint prompts_title_present check (length(btrim(title)) > 0),
  constraint prompts_body_present check (length(btrim(body)) > 0),
  constraint prompts_copies_positive check (copies >= 0),
  constraint prompts_category_known check (
    category in ('artistic', 'photographic', 'stylised', 'character', 'scene', 'other')
  )
);

comment on table public.prompts is
  'The prompt collection. Timestamps are set by the app, not by a trigger, so an import can preserve the originals.';

create index if not exists prompts_updated_at_idx on public.prompts (updated_at desc);
create index if not exists prompts_category_idx   on public.prompts (category);
create index if not exists prompts_tags_idx       on public.prompts using gin (tags);

-- ---------------------------------------------------------- prompt_images --

create table if not exists public.prompt_images (
  id           uuid primary key default gen_random_uuid(),
  prompt_id    text        not null references public.prompts (id) on delete cascade,
  -- Object key inside the storage bucket, not a URL: the public URL is derived
  -- at read time, so moving buckets or domains does not rewrite every row.
  storage_path text        not null unique,
  caption      text        not null default '',
  width        integer,
  height       integer,
  bytes        integer,
  mime         text,
  position     integer     not null default 0,
  created_at   timestamptz not null default now()
);

comment on table public.prompt_images is
  'Sample images shown with a prompt. Rows cascade with the prompt; the stored objects are removed by the app.';

create index if not exists prompt_images_prompt_idx on public.prompt_images (prompt_id, position, created_at);

-- ------------------------------------------------------------------- rls --
--
-- Read is public. There are deliberately NO insert/update/delete policies:
-- every write goes through a server route holding the service_role key, which
-- bypasses RLS. Anything reaching Postgres with the anon key can only select.

alter table public.prompts       enable row level security;
alter table public.prompt_images enable row level security;

drop policy if exists "prompts are publicly readable" on public.prompts;
create policy "prompts are publicly readable"
  on public.prompts for select
  to anon, authenticated
  using (true);

drop policy if exists "prompt images are publicly readable" on public.prompt_images;
create policy "prompt images are publicly readable"
  on public.prompt_images for select
  to anon, authenticated
  using (true);

-- --------------------------------------------------------------- counters --

-- Atomic, so two people copying the same prompt at once cannot lose a count the
-- way a read-modify-write would.
create or replace function public.increment_prompt_copies(p_id text)
returns integer
language sql
as $$
  update public.prompts
     set copies = copies + 1
   where id = p_id
  returning copies;
$$;

-- Only the service_role calls this; the browser never touches it directly.
revoke execute on function public.increment_prompt_copies(text) from public, anon, authenticated;

-- --------------------------------------------------------------- storage --

-- Public bucket: sample images are served straight from their public URL, so
-- no signed-URL round trip on every card. Uploads and deletes have no policy,
-- which leaves them to the service_role.
insert into storage.buckets (id, name, public)
values ('prompt-samples', 'prompt-samples', true)
on conflict (id) do update set public = true;
