import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DeletePrompt from "@/components/DeletePrompt";
import PromptForm from "@/components/PromptForm";
import { isAdmin } from "@/lib/admin";
import { getPrompt } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/prompts/[id]/edit">) {
  const { id } = await params;
  const prompt = await getPrompt(id);
  return { title: prompt ? `Editing ${prompt.title} — Promptbook` : "Prompt not found" };
}

export default async function EditPromptPage({ params }: PageProps<"/prompts/[id]/edit">) {
  const { id } = await params;
  if (!(await isAdmin())) redirect(`/admin?next=/prompts/${encodeURIComponent(id)}/edit`);

  const prompt = await getPrompt(id);
  if (!prompt) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/prompts/${prompt.id}`} className="btn btn-ghost btn-sm -ml-3 max-w-full">
        <span aria-hidden>←</span> <span className="truncate">{prompt.title}</span>
      </Link>
      <h1 className="mb-7 mt-4 text-2xl font-semibold tracking-tight sm:mb-9 sm:text-3xl">
        Edit prompt
      </h1>

      <PromptForm prompt={prompt} />

      {/* Deleting is an editing action, so it lives here rather than on the
          detail page where it would sit next to the copy button. */}
      <div className="mt-12 border-t border-line pt-6">
        <h2 className="text-sm font-medium">Danger zone</h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          Deleting removes the prompt from the collection. There is no undo.
        </p>
        <DeletePrompt id={prompt.id} title={prompt.title} />
      </div>
    </div>
  );
}
