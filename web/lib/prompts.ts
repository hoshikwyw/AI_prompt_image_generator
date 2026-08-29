import type { ProviderId } from "./types";

/**
 * Phase 1 seeds styles from this file. Phase 2 moves them into Postgres with an
 * admin CRUD page — the shape here is deliberately the future table's columns,
 * so that migration is a data move rather than a rewrite.
 *
 * Prompts are written as *transformation* instructions, not scene descriptions.
 * "Restyle the person in this photo as X, keeping their facial features" works;
 * "a portrait of a man in style X" makes the model ignore the upload and invent
 * a stranger. Keep that rule when adding new styles.
 */
export interface StylePrompt {
  slug: string;
  title: string;
  blurb: string;
  prompt: string;
  category: "artistic" | "photographic" | "stylised";
  /** How much the style depends on an exact likeness surviving. */
  difficulty: "easy" | "medium" | "hard";
  /** Which engine this style routes to. Falls back if unconfigured. */
  provider: ProviderId;
  /** Set once you have a real generated sample; null renders a placeholder tile. */
  exampleImage: string | null;
  /** Tailwind gradient used for the placeholder tile until an example exists. */
  accent: string;
  active: boolean;
}

export const PROMPTS: StylePrompt[] = [
  {
    slug: "pencil-sketch",
    title: "Graphite Sketch",
    blurb: "Hand-drawn portrait on textured paper",
    category: "artistic",
    difficulty: "easy",
    provider: "cloudflare",
    exampleImage: null,
    accent: "from-stone-400 to-stone-600",
    active: true,
    prompt:
      "Redraw the person in this photo as a detailed graphite pencil sketch on textured paper. " +
      "Keep their exact facial features, hairstyle, and expression recognisable. " +
      "Use confident cross-hatching for shading and leave the background as bare paper.",
  },
  {
    slug: "oil-painting",
    title: "Renaissance Oil",
    blurb: "17th-century Dutch master treatment",
    category: "artistic",
    difficulty: "easy",
    provider: "cloudflare",
    exampleImage: null,
    accent: "from-amber-700 to-yellow-900",
    active: true,
    prompt:
      "Repaint the person in this photo as a 17th-century Dutch oil portrait with visible brushwork " +
      "and craquelure. Preserve their exact face shape, features, and expression. " +
      "Dramatic chiaroscuro lighting from the left, deep muted background.",
  },
  {
    slug: "pixar-3d",
    title: "3D Animated",
    blurb: "Stylised animated film character",
    category: "stylised",
    difficulty: "medium",
    provider: "cloudflare",
    exampleImage: null,
    accent: "from-sky-400 to-indigo-600",
    active: true,
    prompt:
      "Convert the person in this photo into a 3D animated film character with soft subsurface " +
      "skin shading and expressive stylised proportions. Keep their identity readable: same face " +
      "shape, hairstyle, eye colour, and expression. Warm cinematic key light, soft depth of field.",
  },
  {
    slug: "cyberpunk-neon",
    title: "Cyberpunk Neon",
    blurb: "Rain-slick neon street at night",
    category: "stylised",
    difficulty: "medium",
    provider: "cloudflare",
    exampleImage: null,
    accent: "from-fuchsia-500 to-cyan-500",
    active: true,
    prompt:
      "Restyle this photo as a cyberpunk portrait: the same person on a rain-slick neon street at " +
      "night, lit by magenta and cyan signage with wet reflections. Keep their exact facial " +
      "features and hairstyle unchanged. Cinematic 85mm look, shallow depth of field.",
  },
  {
    slug: "90s-yearbook",
    title: "90s Yearbook",
    blurb: "Mottled backdrop, soft flash, period grain",
    category: "photographic",
    difficulty: "hard",
    provider: "gemini",
    exampleImage: null,
    accent: "from-teal-500 to-blue-700",
    active: true,
    prompt:
      "Restyle this photo as a 1990s high-school yearbook portrait: mottled blue-grey studio " +
      "backdrop, soft flash lighting, slight film grain and period colour cast. " +
      "Keep the person's face completely unchanged and photorealistic; change only the styling, " +
      "wardrobe, lighting, and background.",
  },
  {
    slug: "studio-headshot",
    title: "Corporate Headshot",
    blurb: "Business attire on a clean grey backdrop",
    category: "photographic",
    difficulty: "hard",
    provider: "gemini",
    exampleImage: null,
    accent: "from-slate-500 to-slate-700",
    active: true,
    prompt:
      "Turn this photo into a professional corporate headshot. Keep the person's face, skin " +
      "texture, and expression photorealistic and completely unchanged. Replace the clothing with " +
      "smart business attire and the background with a clean neutral grey studio backdrop. " +
      "Soft large-softbox key light, subtle rim light, sharp focus on the eyes.",
  },
];

export const activePrompts = () => PROMPTS.filter((p) => p.active);
export const promptBySlug = (slug: string) => PROMPTS.find((p) => p.slug === slug && p.active);
