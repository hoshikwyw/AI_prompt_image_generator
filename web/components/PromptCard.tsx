import Link from "next/link";
import PromptActions, { type PromptPatch } from "./PromptActions";
import PromptText from "./PromptText";
import {
  AI_TOOL_LABELS,
  AUDIENCE_LABELS,
  CATEGORY_LABELS,
  type AiTool,
  type Prompt,
  type PromptImage,
} from "@/lib/prompt";

interface Props {
  prompt: Prompt;
  onChange?: (patch: PromptPatch) => void;
  /** Filters in place in the library; without it, a tag links to the library. */
  onTagClick?: (tag: string) => void;
  canEdit?: boolean;
  /** First sample for this prompt, when it has one. */
  image?: PromptImage;
}

/** More than this and the tag row wraps to a second line, unbalancing the grid. */
const TAGS_SHOWN = 3;
const TAG =
  "rounded-full bg-background px-2 py-1 text-[0.6875rem] leading-none text-subtle transition hover:text-foreground";

/** Tool names are long ("Stable Diffusion"); past two the footer would truncate. */
const MODELS_SHOWN = 2;

/** "ChatGPT, Gemini", "Midjourney, Flux +1", or "Any AI" when untagged. */
function toolsLine(models: AiTool[]): string {
  if (models.length === 0) return "Any AI";
  const shown = models.slice(0, MODELS_SHOWN).map((m) => AI_TOOL_LABELS[m]).join(", ");
  const rest = models.length - MODELS_SHOWN;
  return rest > 0 ? `${shown} +${rest}` : shown;
}

/**
 * One prompt in the grid.
 *
 * The whole card opens the prompt: the title's link is stretched over it (its
 * ::after fills the card), and only the tags and the action row sit above it —
 * people tap the preview text as often as the title, especially on a phone.
 *
 * Every card has the same cover — the first sample, or the prompt's accent
 * gradient until one exists — so a row with one sample does not stretch its
 * neighbours into tall empty boxes. Who the prompt is for and what it makes sit
 * on the cover, where they are read first; the body preview below keeps the
 * mono type, because you scan prompts by their opening words.
 */
export default function PromptCard({ prompt, onChange, onTagClick, canEdit, image }: Props) {
  const extraTags = prompt.tags.length - TAGS_SHOWN;
  const href = `/prompts/${prompt.id}`;

  return (
    <article className="card group relative flex flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-(--shadow-lifted)">
      {/* Decorative: the stretched title link covers it. */}
      <div aria-hidden className="relative aspect-video overflow-hidden">
        {image ? (
          // Plain img: user uploads, on an origin the image optimiser is not
          // configured for.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className={`cover-placeholder h-full w-full bg-linear-to-br ${prompt.accent}`} />
        )}

        <div className="pointer-events-none absolute inset-x-3 bottom-3 top-3 flex flex-col items-start justify-between">
          {prompt.audience !== "any" ? (
            <span className="cover-chip">For {AUDIENCE_LABELS[prompt.audience].toLowerCase()}</span>
          ) : (
            <span />
          )}
          <span className="cover-chip">{CATEGORY_LABELS[prompt.category]}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold leading-snug">
            <Link
              href={href}
              className="transition group-hover:text-accent after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-(--radius-lg) focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-(--accent)"
            >
              {prompt.title}
            </Link>
          </h2>
          {prompt.summary && (
            <p className="mt-1 line-clamp-2 text-sm text-muted">{prompt.summary}</p>
          )}
        </div>

        <p className="line-clamp-3 rounded-xl bg-background/60 p-3 font-mono text-xs leading-relaxed text-subtle">
          <PromptText text={prompt.body} />
        </p>

        {prompt.tags.length > 0 && (
          <div className="relative z-10 flex flex-wrap items-center gap-1.5">
            {prompt.tags.slice(0, TAGS_SHOWN).map((tag) =>
              onTagClick ? (
                <button key={tag} type="button" onClick={() => onTagClick(tag)} className={TAG}>
                  #{tag}
                </button>
              ) : (
                <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`} className={TAG}>
                  #{tag}
                </Link>
              ),
            )}
            {extraTags > 0 && (
              <span className="text-[0.6875rem] text-subtle">+{extraTags}</span>
            )}
          </div>
        )}

        <div className="relative z-10 mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
          <span
            className="min-w-0 truncate text-xs text-subtle"
            title={
              prompt.models.length
                ? `Works with ${prompt.models.map((m) => AI_TOOL_LABELS[m]).join(", ")}`
                : "Works with any AI"
            }
          >
            {toolsLine(prompt.models)}
          </span>
          <PromptActions prompt={prompt} onChange={onChange} canEdit={canEdit} />
        </div>
      </div>
    </article>
  );
}
