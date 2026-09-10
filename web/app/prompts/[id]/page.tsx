import Link from "next/link";
import { notFound } from "next/navigation";
import PromptActions from "@/components/PromptActions";
import SampleImages from "@/components/SampleImages";
import { isAdmin } from "@/lib/admin";
import { getPrompt, listImages } from "@/lib/store";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const day = (iso: string) => dateFmt.format(new Date(iso));

export async function generateMetadata({ params }: PageProps<"/prompts/[id]">) {
  const { id } = await params;
  const prompt = await getPrompt(id);
  return { title: prompt ? `${prompt.title} — Promptbook` : "Prompt not found" };
}

export default async function PromptPage({ params }: PageProps<"/prompts/[id]">) {
  const { id } = await params;
  const prompt = await getPrompt(id);
  if (!prompt) notFound();
  const canEdit = await isAdmin();
  const images = (await listImages([prompt.id])).get(prompt.id) ?? [];

  const meta: Array<[string, string]> = [
    ["Category", prompt.category],
    ["Model", prompt.targetModel],
    ["Added", day(prompt.createdAt)],
    ["Updated", day(prompt.updatedAt)],
  ];
  if (prompt.source) meta.push(["Source", prompt.source]);

  return (
    <article className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="btn btn-ghost btn-sm -ml-3">
          <span aria-hidden>←</span> Library
        </Link>
        {canEdit && (
          <Link href={`/prompts/${prompt.id}/edit`} className="btn btn-sm">
            Edit
          </Link>
        )}
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

        {prompt.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {prompt.tags.map((tag) => (
              <Link
                key={tag}
                href={`/?tag=${encodeURIComponent(tag)}`}
                className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted transition hover:border-line-strong hover:text-foreground"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </header>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2 className="text-sm font-medium">Prompt</h2>
          <PromptActions prompt={prompt} canEdit={canEdit} showCopies />
        </div>
        {/* Pre-wrap, not a textarea: the exact whitespace is part of the prompt.
            break-words stops a long unbroken string scrolling the page sideways. */}
        <p className="whitespace-pre-wrap break-words px-4 py-4 font-mono text-[0.8125rem] leading-relaxed sm:px-5 sm:text-sm">
          {prompt.body}
        </p>
      </section>

      <SampleImages
        promptId={prompt.id}
        images={images}
        canEdit={canEdit}
        promptBody={prompt.body}
      />

      {prompt.notes && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-medium">Notes</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{prompt.notes}</p>
        </section>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-line pt-6 text-sm sm:grid-cols-4">
        {meta.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-subtle">{label}</dt>
            <dd className="mt-1 truncate capitalize" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
