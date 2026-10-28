import Link from "next/link";
import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import PromptActions from "@/components/PromptActions";
import PromptCard from "@/components/PromptCard";
import PromptText, { hasPlaceholders } from "@/components/PromptText";
import SampleImages from "@/components/SampleImages";
import ShareButton from "@/components/ShareButton";
import { isAdmin } from "@/lib/admin";
import {
  AI_TOOL_LABELS,
  AUDIENCE_LABELS,
  CATEGORY_LABELS,
  filterToQuery,
  relatedPrompts,
} from "@/lib/prompt";
import { listImages, listPrompts } from "@/lib/store";
import { loadPrompt } from "./load-prompt";

export const dynamic = "force-dynamic";

/** Two rows of two: enough to keep someone browsing, few enough to stay a footer. */
const RELATED = 4;

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const day = (iso: string) => dateFmt.format(new Date(iso));

/** A library view, as a link — built the same way the library writes its URL. */
const libraryLink = (filter: Parameters<typeof filterToQuery>[0]) => {
  const query = filterToQuery(filter);
  return query ? `/?${query}` : "/";
};

export async function generateMetadata({ params }: PageProps<"/prompts/[id]">) {
  const { id } = await params;
  const prompt = await loadPrompt(id);
  if (!prompt) return { title: "Prompt not found" };

  // What a shared link unfurls into: the title, the one-line summary, and the
  // first sample when there is one — the picture is what gets the tap.
  const cover = (await listImages([prompt.id])).get(prompt.id)?.[0];
  const description = prompt.summary || prompt.body.slice(0, 160);
  return {
    title: prompt.title,
    description,
    // One address per prompt: `?utm=…` and other query variants are the same page.
    alternates: { canonical: `/prompts/${prompt.id}` },
    openGraph: {
      title: prompt.title,
      description,
      type: "article",
      ...(cover && { images: [{ url: cover.url, alt: cover.caption || prompt.title }] }),
    },
    twitter: { card: cover ? "summary_large_image" : "summary" },
  };
}

export default async function PromptPage({ params }: PageProps<"/prompts/[id]">) {
  const { id } = await params;
  const prompt = await loadPrompt(id);
  if (!prompt) notFound();
  const canEdit = await isAdmin();
  const related = relatedPrompts(prompt, await listPrompts(), RELATED);
  // One query for this prompt's samples and every suggestion's cover.
  const allImages = await listImages([prompt.id, ...related.map((p) => p.id)]);
  const images = allImages.get(prompt.id) ?? [];
  const placeholders = hasPlaceholders(prompt.body);

  // Who it is for, what it makes and where it works are what a reader checks
  // before copying, so they lead the page as links to more of the same.
  const facts: Array<{ label: string; href: string }> = [
    prompt.audience === "any"
      ? // Explicitly everyone: a bare "/" opens on the visitor's saved choice,
        // which would show women's prompts under a "For everyone" link.
        { label: "For everyone", href: "/?for=all" }
      : {
          label: `For ${AUDIENCE_LABELS[prompt.audience].toLowerCase()}`,
          href: libraryLink({ audience: prompt.audience }),
        },
    { label: CATEGORY_LABELS[prompt.category], href: libraryLink({ category: prompt.category }) },
    ...(prompt.models.length
      ? prompt.models.map((m) => ({ label: AI_TOOL_LABELS[m], href: libraryLink({ model: m }) }))
      : [{ label: "Any AI", href: "/?ai=" }]),
  ];

  const meta: Array<[string, string]> = [
    ["Added", day(prompt.createdAt)],
    ["Updated", day(prompt.updatedAt)],
  ];
  if (prompt.copies > 0) meta.push(["Copied", `${prompt.copies}×`]);
  if (prompt.source) meta.push(["Source", prompt.source]);

  return (
    <article className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <BackLink />
        <div className="flex items-center gap-2">
          <ShareButton title={prompt.title} text={prompt.summary || undefined} />
          {canEdit && (
            <Link href={`/prompts/${prompt.id}/edit`} className="btn btn-sm">
              Edit
            </Link>
          )}
        </div>
      </div>

      <header className="mb-7 mt-5 sm:mb-9">
        <div
          className={`mb-5 h-1 w-20 rounded-full bg-linear-to-r ${prompt.accent}`}
          aria-hidden
        />
        <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
          {prompt.title}
        </h1>
        {prompt.summary && (
          <p className="mt-3 text-base text-muted sm:text-lg">{prompt.summary}</p>
        )}

        <ul className="mt-5 flex flex-wrap gap-2" aria-label="About this prompt">
          {facts.map((fact) => (
            <li key={fact.label}>
              <Link href={fact.href} className="chip">
                {fact.label}
              </Link>
            </li>
          ))}
        </ul>
      </header>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2 className="text-sm font-medium">Prompt</h2>
          <PromptActions prompt={prompt} canEdit={canEdit} />
        </div>
        {/* Pre-wrap, not a textarea: the exact whitespace is part of the prompt.
            break-words stops a long unbroken string scrolling the page sideways. */}
        <p className="whitespace-pre-wrap wrap-break-word px-4 py-4 font-mono text-[0.8125rem] leading-relaxed sm:px-5 sm:text-sm">
          <PromptText text={prompt.body} />
        </p>
        {placeholders && (
          <p className="border-t border-line px-4 py-2.5 text-xs text-muted sm:px-5">
            Change the <mark className="placeholder">[highlighted]</mark> parts to suit you before
            you send it.
          </p>
        )}
      </section>

      {/* Straight under the prompt: "attach your photo first" is the line that
          decides whether the copy works, so it cannot wait below the samples. */}
      {prompt.notes && (
        <aside className="mt-4 flex gap-3 rounded-lg border border-(--accent-border) bg-(--accent-soft) px-4 py-3 sm:px-5">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-accent"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden
          >
            <circle cx="8" cy="8" r="6.25" />
            <path d="M8 7.25v3.5M8 5.25v.01" />
          </svg>
          <div className="min-w-0">
            <h2 className="text-sm font-medium">Before you paste</h2>
            <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {prompt.notes}
            </p>
          </div>
        </aside>
      )}

      <SampleImages
        promptId={prompt.id}
        images={images}
        canEdit={canEdit}
        promptBody={prompt.body}
      />

      {prompt.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-1.5">
          {prompt.tags.map((tag) => (
            <Link
              key={tag}
              href={libraryLink({ tag })}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted transition hover:border-line-strong hover:text-foreground"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-line pt-6 text-sm sm:grid-cols-4">
        {meta.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-subtle">{label}</dt>
            <dd className="mt-1 truncate" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {related.length > 0 && (
        <section className="mt-12 border-t border-line pt-8" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-4 text-base font-medium">
            More like this
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {related.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                canEdit={canEdit}
                image={allImages.get(p.id)?.[0]}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
