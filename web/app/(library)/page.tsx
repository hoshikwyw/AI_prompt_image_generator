import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import Library from "@/components/Library";
import { isAdmin } from "@/lib/admin";
import { PREFS_COOKIE, readPrefs } from "@/lib/prompt";
import { listImages, listPrompts } from "@/lib/store";

// The collection is read from disk per request, so this page is never static.
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  // A plain visit opens on what this visitor picked last time; the library
  // reads its filter from the URL itself, so it stays right after Back.
  const savedPrefs = readPrefs((await cookies()).get(PREFS_COOKIE)?.value);

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
      // New on every server render, so the library starts over from fresh data
      // and the current URL: a click on the logo or a refresh after an import
      // used to keep the old filter and the old list, since state outlives
      // props that change under it.
      key={randomUUID()}
      prompts={prompts}
      savedPrefs={savedPrefs}
      canEdit={await isAdmin()}
      covers={covers}
    />
  );
}
