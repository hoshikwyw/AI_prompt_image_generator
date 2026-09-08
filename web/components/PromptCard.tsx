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

/**
 * One prompt in the grid. The body preview is the point — you scan prompts by
 * their opening words far more than by their title — so it gets the mono type
 * and three clamped lines rather than a decorative image tile.
 */
export default function PromptCard({ prompt, onChange, onTagClick, canEdit, image }: Props) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card transition hover:border-neutral-600">
      {image ? (
        <Link href={`/prompts/${prompt.id}`} className="block">
          {/* Plain img: user uploads, on an origin the image optimiser is not
              configured for. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.caption || `Sample output for ${prompt.title}`}
            loading="lazy"
            className="aspect-4/3 w-full object-cover"
          />
        </Link>
      ) : (
        <div className={`h-1.5 w-full bg-linear-to-r ${prompt.accent}`} aria-hidden />
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-medium leading-snug">
              <Link href={`/prompts/${prompt.id}`} className="transition hover:text-white">
                {prompt.title}
              </Link>
            </h2>
            <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] capitalize text-muted">
              {prompt.category}
            </span>
          </div>
          {prompt.summary && <p className="mt-1 text-sm text-muted">{prompt.summary}</p>}
        </div>

        <p className="line-clamp-3 rounded-lg bg-background/60 p-3 font-mono text-xs leading-relaxed text-muted">
          {prompt.body}
        </p>

        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {prompt.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick?.(tag)}
                className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted transition hover:text-foreground"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span className="truncate font-mono text-[11px] text-muted" title={prompt.targetModel}>
            {prompt.targetModel}
          </span>
          <PromptActions prompt={prompt} onChange={onChange} canEdit={canEdit} />
        </div>
      </div>
    </article>
  );
}
