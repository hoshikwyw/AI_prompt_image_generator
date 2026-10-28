import { notFound } from "next/navigation";
import { loadPrompt } from "./load-prompt";

/**
 * Settles "does this prompt exist" before anything streams. The page sits
 * inside loading.tsx's Suspense boundary, and once the skeleton has gone out
 * the status is fixed at 200 — so a deleted prompt answered 200 with a
 * not-found page, a soft 404 to search engines and link checkers. Here, above
 * that boundary, notFound() still sets a real 404. The read is one row and is
 * shared with the page (see loadPrompt), so the skeleton is barely delayed.
 */
export default async function PromptViewLayout({ children, params }: LayoutProps<"/prompts/[id]">) {
  const { id } = await params;
  if (!(await loadPrompt(id))) notFound();
  return children;
}
