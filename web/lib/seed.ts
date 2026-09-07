import { PROMPTS, type StylePrompt } from "./prompts";
import type { Prompt } from "./prompt";

/**
 * First-run contents of the collection.
 *
 * The six Phase 1 styles are the starting library rather than a separate
 * hard-coded list — the same text, now editable. Seeding happens once: after
 * the store file exists this module is never consulted again, so editing a
 * seed here will not overwrite a prompt you have since changed.
 */

/** Fixed so a fresh seed is byte-identical between machines. */
const SEEDED_AT = "2026-08-29T00:00:00.000Z";

const MODEL_OF: Record<StylePrompt["provider"], string> = {
  cloudflare: "flux.2-klein",
  gemini: "gemini-3.1-flash-lite-image",
};

/** Kept as a tag because it is the one thing Phase 0 actually measured. */
const difficultyTag = (d: StylePrompt["difficulty"]) => `likeness-${d}`;

const NOTES: Record<StylePrompt["difficulty"], string> = {
  easy: "Drawn and painted looks tolerate a rough likeness, so a 512px input is not a problem.",
  medium: "Stylised proportions drift first. Name the features to keep, not just the style.",
  hard:
    "Photorealistic output is where a weak model stops looking like the subject — the input is " +
    "capped at 512×512, so the face has little detail to work from. Check this one first.",
};

function fromStyle(style: StylePrompt, index: number): Prompt {
  return {
    id: style.slug,
    title: style.title,
    summary: style.blurb,
    body: style.prompt,
    notes: NOTES[style.difficulty],
    category: style.category,
    tags: ["portrait", "restyle", style.category, difficultyTag(style.difficulty)],
    targetModel: MODEL_OF[style.provider],
    source: "Phase 0 probe",
    accent: style.accent,
    favorite: false,
    copies: 0,
    createdAt: SEEDED_AT,
    // Spread by a second each so "recent" has a stable, meaningful order.
    updatedAt: new Date(Date.parse(SEEDED_AT) + index * 1000).toISOString(),
  };
}

export function seedPrompts(): Prompt[] {
  return PROMPTS.filter((p) => p.active).map(fromStyle);
}
