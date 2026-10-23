import type { Prompt } from "./prompt";

/**
 * First-run contents of the collection.
 *
 * Seeding happens once: after the store file exists this module is never
 * consulted again, so editing a seed here will not overwrite a prompt you have
 * since changed.
 */

/** Fixed so a fresh seed is byte-identical between machines. */
const SEEDED_AT = "2026-08-29T00:00:00.000Z";

type SeedPrompt = Omit<Prompt, "favorite" | "copies" | "createdAt" | "updatedAt">;

const SEEDS: SeedPrompt[] = [
  {
    id: "pencil-sketch",
    title: "Graphite Sketch",
    summary: "Hand-drawn portrait on textured paper",
    category: "artistic",
    tags: ["portrait", "restyle", "artistic"],
    targetModel: "any",
    source: "",
    notes: "Drawn and painted looks tolerate a rough likeness.",
    accent: "from-stone-400 to-stone-600",
    body:
      "Redraw the person in this photo as a detailed graphite pencil sketch on textured paper. " +
      "Keep their exact facial features, hairstyle, and expression recognisable. " +
      "Use confident cross-hatching for shading and leave the background as bare paper.",
  },
  {
    id: "oil-painting",
    title: "Renaissance Oil",
    summary: "17th-century Dutch master treatment",
    category: "artistic",
    tags: ["portrait", "restyle", "artistic"],
    targetModel: "any",
    source: "",
    notes: "Drawn and painted looks tolerate a rough likeness.",
    accent: "from-amber-700 to-yellow-900",
    body:
      "Repaint the person in this photo as a 17th-century Dutch oil portrait with visible brushwork " +
      "and craquelure. Preserve their exact face shape, features, and expression. " +
      "Dramatic chiaroscuro lighting from the left, deep muted background.",
  },
  {
    id: "pixar-3d",
    title: "3D Animated",
    summary: "Stylised animated film character",
    category: "stylised",
    tags: ["portrait", "restyle", "stylised"],
    targetModel: "any",
    source: "",
    notes: "Stylised proportions drift first. Name the features to keep, not just the style.",
    accent: "from-sky-400 to-indigo-600",
    body:
      "Convert the person in this photo into a 3D animated film character with soft subsurface " +
      "skin shading and expressive stylised proportions. Keep their identity readable: same face " +
      "shape, hairstyle, eye colour, and expression. Warm cinematic key light, soft depth of field.",
  },
  {
    id: "cyberpunk-neon",
    title: "Cyberpunk Neon",
    summary: "Rain-slick neon street at night",
    category: "stylised",
    tags: ["portrait", "restyle", "stylised"],
    targetModel: "any",
    source: "",
    notes: "Stylised proportions drift first. Name the features to keep, not just the style.",
    accent: "from-fuchsia-500 to-cyan-500",
    body:
      "Restyle this photo as a cyberpunk portrait: the same person on a rain-slick neon street at " +
      "night, lit by magenta and cyan signage with wet reflections. Keep their exact facial " +
      "features and hairstyle unchanged. Cinematic 85mm look, shallow depth of field.",
  },
  {
    id: "90s-yearbook",
    title: "90s Yearbook",
    summary: "Mottled backdrop, soft flash, period grain",
    category: "photographic",
    tags: ["portrait", "restyle", "photographic"],
    targetModel: "any",
    source: "",
    notes: "Photorealistic output is where a weak model stops looking like the subject.",
    accent: "from-teal-500 to-blue-700",
    body:
      "Restyle this photo as a 1990s high-school yearbook portrait: mottled blue-grey studio " +
      "backdrop, soft flash lighting, slight film grain and period colour cast. " +
      "Keep the person's face completely unchanged and photorealistic; change only the styling, " +
      "wardrobe, lighting, and background.",
  },
  {
    id: "studio-headshot",
    title: "Corporate Headshot",
    summary: "Business attire on a clean grey backdrop",
    category: "photographic",
    tags: ["portrait", "restyle", "photographic"],
    targetModel: "any",
    source: "",
    notes: "Photorealistic output is where a weak model stops looking like the subject.",
    accent: "from-slate-500 to-slate-700",
    body:
      "Turn this photo into a professional corporate headshot. Keep the person's face, skin " +
      "texture, and expression photorealistic and completely unchanged. Replace the clothing with " +
      "smart business attire and the background with a clean neutral grey studio backdrop. " +
      "Soft large-softbox key light, subtle rim light, sharp focus on the eyes.",
  },
];

export function seedPrompts(): Prompt[] {
  return SEEDS.map((seed, index) => ({
    ...seed,
    favorite: false,
    copies: 0,
    createdAt: SEEDED_AT,
    // Spread by a second each so "recent" has a stable, meaningful order.
    updatedAt: new Date(Date.parse(SEEDED_AT) + index * 1000).toISOString(),
  }));
}
