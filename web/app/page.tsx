import Library from "@/components/Library";
import { parseFilter } from "@/lib/prompt";
import { listPrompts } from "@/lib/store";

// The collection is read from disk per request, so this page is never static.
export const dynamic = "force-dynamic";

export default async function LibraryPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const get = (key: string) => (typeof params[key] === "string" ? params[key] : null);

  // The whole collection goes to the client, which filters it there. The parsed
  // filter is only the starting view, so clearing a chip does not need a fetch.
  const prompts = await listPrompts();

  return <Library prompts={prompts} initialFilter={parseFilter(get)} />;
}
