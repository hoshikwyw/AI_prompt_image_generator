-- Promptbook — prompts for any kind of image, for a chosen audience and AI.
--
-- 1. Categories widen from portrait restyles to every kind of image.
-- 2. `audience` says who a prompt suits: any, female, male or couple.
-- 3. `models` lists the AI tools a prompt is known to work in, replacing the
--    free-text `target_model`. An empty list means it is not tied to one tool.
--
-- Mirrors CATEGORIES, AUDIENCES and AI_TOOLS in web/lib/prompt.ts. Safe to run
-- more than once: columns are added IF NOT EXISTS, constraints are dropped
-- before being recreated, and the backfills only touch rows still in the old
-- shape.
--
-- On a live project, DEPLOY THE NEW CODE FIRST, then run this. The new code
-- reads the old columns until this has run, so the site stays up in between.
-- The other way round, the old code is still serving while categories change
-- under it: it does not know the new names, and any edit it saves resets the
-- prompt's category to 'other'.

-- ---------------------------------------------------------------- columns --

alter table public.prompts add column if not exists audience text   not null default 'any';
alter table public.prompts add column if not exists models   text[] not null default '{}';

-- ------------------------------------------------------------- backfills --

-- Free-text model names onto the fixed list. Kept in step with
-- LEGACY_MODEL_PATTERNS in web/lib/prompt.ts.
--
-- `target_model` is reset to 'any' as each row is mapped, so a re-run cannot
-- map it again: without that, a prompt an admin later set to "Any AI" (an
-- empty list) would get its old tool back from the stale text.
--
-- Guarded, so the file still runs again once target_model has been dropped
-- as suggested at the end — this file is meant to be safe to re-run.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'prompts' and column_name = 'target_model'
  ) then
    update public.prompts
       set models = case
         when target_model ~* 'gemini|nano.?banana|imagen'  then array['gemini']
         when target_model ~* 'chatgpt|gpt|dall'            then array['chatgpt']
         when target_model ~* 'midjourney'                  then array['midjourney']
         when target_model ~* 'flux'                        then array['flux']
         when target_model ~* 'stable.?diffusion|sdxl'      then array['stable-diffusion']
         when target_model ~* 'leonardo'                    then array['leonardo']
         when target_model ~* 'ideogram'                    then array['ideogram']
         when target_model ~* 'grok'                        then array['grok']
         when target_model ~* 'copilot|bing|designer'       then array['copilot']
         else '{}'::text[]
       end,
           target_model = 'any'
     where models = '{}' and target_model <> 'any';
  end if;
end $$;

-- The old constraint has to go before rows can take the new category names.
alter table public.prompts drop constraint if exists prompts_category_known;

-- Kept in step with LEGACY_CATEGORIES in web/lib/prompt.ts.
update public.prompts
   set category = case category
     when 'artistic'     then 'art'
     when 'photographic' then 'portrait'
     when 'stylised'     then 'art'
     when 'character'    then 'portrait'
     when 'scene'        then 'landscape'
     else category
   end
 where category in ('artistic', 'photographic', 'stylised', 'character', 'scene');

-- ----------------------------------------------------------- constraints --

alter table public.prompts add constraint prompts_category_known check (
  category in (
    'portrait', 'fashion', 'anime', 'art', '3d', 'fantasy', 'landscape',
    'architecture', 'product', 'logo', 'animals', 'food', 'other'
  )
);

alter table public.prompts drop constraint if exists prompts_audience_known;
alter table public.prompts add constraint prompts_audience_known check (
  audience in ('any', 'female', 'male', 'couple')
);

alter table public.prompts drop constraint if exists prompts_models_known;
alter table public.prompts add constraint prompts_models_known check (
  models <@ array[
    'chatgpt', 'gemini', 'midjourney', 'flux', 'stable-diffusion',
    'leonardo', 'ideogram', 'grok', 'copilot'
  ]::text[]
);

create index if not exists prompts_audience_idx on public.prompts (audience);

-- -------------------------------------------------------------- legacy --

-- Mapped into `models` above and no longer read by the app once this has run.
-- Left in place so rolling back to the previous code keeps a readable table;
-- drop it once you are sure you will not:
--
--   alter table public.prompts drop column target_model;
do $
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'prompts' and column_name = 'target_model'
  ) then
    comment on column public.prompts.target_model is
      'Deprecated: replaced by models. Unused by the app; safe to drop.';
  end if;
end $;
