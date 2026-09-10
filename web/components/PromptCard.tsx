import Link from "next/link";
import PromptActions from "./PromptActions";
import type { Prompt, PromptImage } from "@/lib/prompt";

interface Props {
  prompt: Prompt;
  onChange?: (patch: Partial<Prompt>) => void;
  onTagClick?: (tag: string) => void;
  canEdit?: boolean;
  /** First sample for this prompt, when it has one. */
  image?: PromptImage;
}

/** More than this and the tag row wraps to a second line, unbalancing the grid. */
const TAGS_SHOWN = 3;

/**
 * One prompt in the grid. The body preview is the point — you scan prompts by
 * their opening words far more than by their title — so it keeps the mono type
 * and three clamped lines even when there is a sample image above it.
 */
export default function PromptCard({ prompt, onChange, onTagClick, canEdit, image }: Props) {
  const extraTags = prompt.tags.length - TAGS_SHOWN;

  return (
    <article className="card group flex flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-lifted)]">
      {image ? (
        <Link href={`/prompts/${prompt.id}`} className="block overflow-hidden">
          {/* Plain img: user uploads, on an origin the image optimiser is not
              configured for. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.caption || `Sample output for ${prompt.title}`}
            loading="lazy"
            className="aspect-4/3 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        </Link>
      ) : (
        <div className={`h-1 w-full bg-linear-to-r ${prompt.accent}`} aria-hidden />
      )}

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 text-[0.9375rem] font-medium leading-snug">
              <Link
                href={`/prompts/${prompt.id}`}
                className="transition hover:text-white"
                // Makes the whole card header comfortable to hit on a phone.
                title={prompt.title}
              >
                {prompt.title}
              </Link>
            </h2>
            <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[0.6875rem] capitalize text-subtle">
              {prompt.category}
            </span>
          </div>
          {prompt.summary && (
            <p className="mt-1 line-clamp-2 text-sm text-muted">{prompt.summary}</p>
          )}
        </div>

        <p className="line-clamp-3 rounded-xl bg-background/60 p-3 font-mono text-xs leading-relaxed text-subtle">
          {prompt.body}
        </p>

        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {prompt.tags.slice(0, TAGS_SHOWN).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick?.(tag)}
                className="rounded-full bg-background px-2 py-1 text-[0.6875rem] leading-none text-subtle transition hover:text-foreground"
              >
                #{tag}
              </button>
            ))}
            {extraTags > 0 && (
              <span className="text-[0.6875rem] text-subtle">+{extraTags}</span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
          <span
            className="min-w-0 truncate font-mono text-[0.6875rem] text-subtle"
            title={prompt.targetModel}
          >
            {prompt.targetModel}
          </span>
          <PromptActions prompt={prompt} onChange={onChange} canEdit={canEdit} />
        </div>
      </div>
    </article>
  );
}
