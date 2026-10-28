import Link from "next/link";
import BackLink from "@/components/BackLink";
import CodeTabs from "@/components/CodeTabs";
import { LICENCE } from "@/lib/openapi";
import {
  AI_TOOLS,
  AI_TOOL_LABELS,
  AUDIENCE_FILTERS,
  AUDIENCE_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  SORTS,
} from "@/lib/prompt";
import { MAX_LIMIT, toPublicPrompt } from "@/lib/public-api";
import { SITE_URL } from "@/lib/site";
import { listImages, listPrompts } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Free API",
  description:
    "A free, open, read-only API for AI image prompts. No key, no sign-up — search by audience, AI tool and category.",
};

const BASE = `${SITE_URL}/api/v1`;

const ENDPOINTS: Array<[string, string]> = [
  ["/prompts", "Search and filter prompts, a page at a time"],
  ["/prompts/{id}", "One prompt, with all its sample images"],
  ["/prompts/{id}/related", "Prompts like this one (limit 1–12, default 4)"],
  ["/random", "One random prompt — takes the same filters"],
  ["/categories", "Categories, with labels and counts"],
  ["/audiences", "Audiences, with labels and counts"],
  ["/tools", "AI tools, with labels and counts"],
  ["/tags", "Tags in use, most used first"],
  ["/images/{id}", "A sample image (cached for a year)"],
  ["/openapi.json", "This API as an OpenAPI 3.1 document"],
];

const ERRORS: Array<[string, string, string]> = [
  ["400", "invalid_parameter", "A parameter is wrong. `param` names it and `allowed` lists the values it takes."],
  ["404", "not_found", "No prompt or image has that id."],
  ["404", "no_match", "/random found nothing for those filters."],
  ["429", "rate_limited", "Too many requests. Wait the seconds in the Retry-After header."],
];

const code = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values).trim();

const QUICK_START = [
  {
    label: "curl",
    code: code`curl "${BASE}/prompts?for=female&ai=gemini&limit=5"`,
  },
  {
    label: "JavaScript",
    code: code`
const res = await fetch("${BASE}/prompts?for=female&ai=gemini&limit=5");
const { data, meta } = await res.json();

for (const p of data) {
  console.log(p.title, "→", p.prompt);
}
console.log(meta.total, "prompts match");`,
  },
  {
    label: "Python",
    code: code`
import requests

res = requests.get("${BASE}/prompts", params={"for": "female", "ai": "gemini", "limit": 5})
res.raise_for_status()
for p in res.json()["data"]:
    print(p["title"], "→", p["prompt"])`,
  },
];

const PAGINATION = [
  {
    label: "JavaScript",
    code: code`
// Every prompt, 100 at a time. Follow meta.nextCursor until it is null.
const all = [];
let cursor = null;
do {
  const url = new URL("${BASE}/prompts");
  url.searchParams.set("limit", "100");
  if (cursor) url.searchParams.set("cursor", cursor);
  const { data, meta } = await (await fetch(url)).json();
  all.push(...data);
  cursor = meta.nextCursor;
} while (cursor);`,
  },
  {
    label: "Python",
    code: code`
import requests

prompts, cursor = [], None
while True:
    params = {"limit": 100, **({"cursor": cursor} if cursor else {})}
    page = requests.get("${BASE}/prompts", params=params).json()
    prompts += page["data"]
    cursor = page["meta"]["nextCursor"]
    if not cursor:
        break`,
  },
];

const ATTRIBUTION = code`
Prompt: “Golden Hour Saree” from Promptbook — ${SITE_URL}/prompts/golden-hour-saree
Licensed CC BY 4.0`;

/** Inline code, in the site's mono face. */
const C = ({ children }: { children: React.ReactNode }) => (
  <code className="whitespace-nowrap rounded-md bg-raised px-1.5 py-0.5 font-mono text-[0.8125em]">{children}</code>
);

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-8">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">
        <a href={`#${id}`} className="hover:text-accent">
          {title}
        </a>
      </h2>
      <div className="space-y-4 text-sm leading-relaxed text-muted [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

const FILTERS: Array<[string, string, string]> = [
  ["q", "any words", "Searches title, summary, prompt, notes, tags and tool names. Up to 100 characters."],
  ["category", CATEGORIES.join(", "), CATEGORIES.map((c) => CATEGORY_LABELS[c]).join(", ")],
  ["for", AUDIENCE_FILTERS.join(", "), `Who it is for (${AUDIENCE_FILTERS.map((a) => AUDIENCE_LABELS[a]).join(", ")}). Prompts that suit anyone are included, after the exact matches. Alias: audience.`],
  ["ai", AI_TOOLS.join(", "), `The tool you will paste into (${AI_TOOLS.map((t) => AI_TOOL_LABELS[t]).join(", ")}). Prompts tagged with no tool are included, after. Alias: tool.`],
  ["tag", "a tag from /tags", "Exact tag, e.g. photo-edit."],
  ["featured", "true, false", "true for editor's picks only."],
  ["sort", SORTS.join(", "), "Default most-copied."],
  ["limit", `1–${MAX_LIMIT}`, "Page size, default 20."],
  ["cursor", "meta.nextCursor", "The next page, exactly as the last response gave it."],
];

export default async function ApiDocsPage() {
  // A real prompt through the same function the API uses, so the example
  // cannot drift from what the API actually returns.
  const [sample] = await listPrompts({ sort: "recent" });
  const cover = sample ? (await listImages([sample.id])).get(sample.id)?.[0] : undefined;
  const example = sample
    ? JSON.stringify({ data: toPublicPrompt(sample, SITE_URL, cover) }, null, 2)
    : null;

  return (
    <article className="mx-auto max-w-3xl">
      <BackLink />

      <header className="mb-10 mt-5">
        <p className="text-sm font-medium text-accent">Developers</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
          Free Promptbook API
        </h1>
        <p className="mt-3 text-base text-muted sm:text-lg">
          Every prompt in the library, as JSON. No key, no sign-up, no cost — call it from a website,
          an app, a bot or a script.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="At a glance">
          {["Free", "No API key", "Read-only", "CORS open", `${LICENCE.name} prompts`].map((t) => (
            <li key={t} className="chip pointer-events-none">
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/api/reference" className="btn btn-primary">
            Try it in the browser
          </Link>
          <a href="/api/v1/openapi.json" className="btn">
            OpenAPI spec
          </a>
        </div>
      </header>

      <div className="space-y-10">
        <Section id="quick-start" title="Quick start">
          <p>
            Base URL: <C>{BASE}</C>. Every response is JSON. Lists come as{" "}
            <C>{"{ data, meta }"}</C>, single items as <C>{"{ data }"}</C>.
          </p>
          <CodeTabs label="Quick start language" samples={QUICK_START} />
        </Section>

        <Section id="endpoints" title="Endpoints">
          <p>All are <strong>GET</strong>, and all are relative to the base URL.</p>
          <div className="card divide-y divide-line overflow-hidden">
            {ENDPOINTS.map(([path, what]) => (
              <div key={path} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                <code className="shrink-0 font-mono text-[0.8125rem] text-foreground sm:w-56">{path}</code>
                <span>{what}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="filters" title="Filters and paging">
          <p>
            <C>/prompts</C> takes all of these; <C>/random</C> takes all but the paging ones. Combine
            freely. A value the API does not know is an error, not ignored — so a typo never quietly
            returns everything.
          </p>
          <div className="card divide-y divide-line overflow-hidden">
            {FILTERS.map(([name, values, note]) => (
              <div key={name} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <code className="font-mono text-[0.8125rem] font-medium text-foreground">{name}</code>
                  <code className="font-mono text-xs">{values}</code>
                </div>
                <p className="mt-1">{note}</p>
              </div>
            ))}
          </div>
          <p>
            To get everything, follow <C>meta.nextCursor</C> until it is <C>null</C>:
          </p>
          <CodeTabs label="Pagination language" samples={PAGINATION} />
        </Section>

        <Section id="response" title="What a prompt looks like">
          <p>
            <C>prompt</C> is the text to paste. <C>placeholders</C> lists the <C>[bracketed]</C> parts
            meant to be changed. <C>notes</C> often says what the prompt needs — usually “attach your
            photo first”. <C>tools</C> empty means it works in any tool.{" "}
            <C>/prompts/{"{id}"}</C> adds an <C>images</C> array with every sample.
          </p>
          {example && <CodeTabs label="Example response" samples={[{ label: "JSON", code: example }]} />}
        </Section>

        <Section id="errors" title="Errors">
          <p>
            Errors share one shape: <C>{"{ error: { code, message } }"}</C>, sometimes with more
            detail.
          </p>
          <div className="card divide-y divide-line overflow-hidden">
            {ERRORS.map(([status, errorCode, what]) => (
              <div key={errorCode} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
                <code className="shrink-0 font-mono text-[0.8125rem] text-foreground sm:w-48">
                  {status} {errorCode}
                </code>
                <span>{what}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="limits" title="Limits and caching">
          <p>
            The API runs on free hosting, so it asks you to be kind: <strong>about 60 requests a
            minute</strong> from one address. Over that, it answers <C>429</C> with a{" "}
            <C>Retry-After</C> header.
          </p>
          <p>
            Responses are cached — prompt lists and prompts for about 5 minutes, filter lists for an
            hour, images for a year. Cache on your side too: a new prompt takes a few minutes to show
            up anyway. If you want everything, page through <C>/prompts</C> once rather than calling
            it per user.
          </p>
        </Section>

        <Section id="terms" title="Terms of use">
          <p>
            <strong>Prompts are free to use under {LICENCE.name}</strong> — in your own work, apps
            and products, including commercially — as long as you credit Promptbook and link to the
            prompt. For example:
          </p>
          <CodeTabs label="Attribution example" samples={[{ label: "Attribution", code: ATTRIBUTION }]} />
          <ul className="list-disc space-y-2 pl-5">
            <li>
              The licence covers the prompt text and its details. A prompt with a <C>source</C> came
              from someone else — keep their credit too.
            </li>
            <li>
              <strong>Sample images</strong> show what a prompt can produce. They are not covered by
              the licence: show them alongside the prompt, but do not reuse them on their own.
            </li>
            <li>
              The API is provided as is, free, with no guarantee of uptime. Addresses that abuse it
              may be blocked.
            </li>
            <li>
              <strong>v1 stays stable.</strong> Fields may be added, but none are renamed or removed;
              breaking changes would come as <C>/api/v2</C>, with notice here.
            </li>
          </ul>
          <p>
            Full licence text:{" "}
            <a href={LICENCE.url} className="text-accent underline-offset-2 hover:underline">
              {LICENCE.url}
            </a>
          </p>
        </Section>
      </div>
    </article>
  );
}
