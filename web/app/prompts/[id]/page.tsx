import Link from "next/link";
import { notFound } from "next/navigation";
import PromptActions from "@/components/PromptActions";
import { getPrompt } from "@/lib/store";

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

  const meta: Array<[string, string]> = [
    ["Category", prompt.category],
    ["Model", prompt.targetModel],
    ["Added", day(prompt.createdAt)],
    ["Updated", day(prompt.updatedAt)],
  ];
  if (prompt.source) meta.push(["Source", prompt.source]);

  return (
    <article>
      <Link href="/" className="text-sm text-muted transition hover:text-foreground">
        ← Library
      </Link>

      <header className="mb-8 mt-4">
        <div className={`mb-5 h-1.5 w-24 rounded-full bg-linear-to-r ${prompt.accent}`} aria-hidden />
        <h1 className="text-3xl font-semibold tracking-tight">{prompt.title}</h1>
        {prompt.summary && <p className="mt-2 max-w-2xl text-muted">{prompt.summary}</p>}

        {prompt.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {prompt.tags.map((tag) => (
              <Link
                key={tag}
                href={`/?tag=${encodeURIComponent(tag)}`}
                className="rounded-full bg-card px-2.5 py-1 text-[11px] text-muted transition hover:text-foreground"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </header>

      <section className="rounded-2xl border border-line bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h2 className="text-sm font-medium">Prompt</h2>
          <PromptActions prompt={prompt} showCopies />
        </div>
        {/* Pre-wrap, not a textarea: the exact whitespace is part of the prompt. */}
        <p className="whitespace-pre-wrap px-5 py-4 font-mono text-sm leading-relaxed">
          {prompt.body}
        </p>
      </section>

      {prompt.notes && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium">Notes</h2>
          <p className="max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {prompt.notes}
          </p>
        </section>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-line pt-6 text-sm sm:grid-cols-4">
        {meta.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-0.5 truncate capitalize" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
