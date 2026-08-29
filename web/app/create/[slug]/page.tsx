import Link from "next/link";
import { notFound } from "next/navigation";
import Studio from "@/components/Studio";
import { activePrompts, promptBySlug } from "@/lib/prompts";

export function generateStaticParams() {
  return activePrompts().map((p) => ({ slug: p.slug }));
}

export default async function CreatePage({ params }: PageProps<"/create/[slug]">) {
  const { slug } = await params;
  const style = promptBySlug(slug);
  if (!style) notFound();

  return (
    <div>
      <Link href="/" className="text-sm text-muted transition hover:text-foreground">
        ← All styles
      </Link>

      <div className="mb-8 mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">{style.title}</h1>
        <p className="mt-2 max-w-xl text-muted">{style.blurb}</p>
      </div>

      <Studio style={style} />
    </div>
  );
}
