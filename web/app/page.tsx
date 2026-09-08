import Library from "@/components/Library";
import { isAdmin } from "@/lib/admin";
import { parseFilter } from "@/lib/prompt";
import { listImages, listPrompts } from "@/lib/store";

// The collection is read from disk per request, so this page is never static.
export const dynamic = "force-dynamic";

export default async function LibraryPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const get = (key: string) => (typeof params[key] === "string" ? params[key] : null);

  // The whole collection goes to the client, which filters it there. The parsed
  // filter is only the starting view, so clearing a chip does not need a fetch.
  const prompts = await listPrompts();

  // One query for every card's cover, rather than one per card.
  const images = await listImages(prompts.map((p) => p.id));
  const covers = Object.fromEntries(
    [...images].flatMap(([id, list]) => (list[0] ? [[id, list[0]] as const] : [])),
  );

  return (
    <Library
      prompts={prompts}
      initialFilter={parseFilter(get)}
      canEdit={await isAdmin()}
      covers={covers}
    />
  );
}
