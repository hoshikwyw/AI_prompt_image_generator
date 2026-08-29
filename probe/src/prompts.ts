/**
 * Starter styles for the likeness test.
 *
 * These are written as *transformation* instructions, not scene descriptions.
 * "Restyle the person in this photo as X, keeping their facial features" works;
 * "a portrait of a man in style X" makes the model ignore the upload and
 * invent a stranger. Same wording rule applies to the admin prompt form later.
 *
 * Ordered easy -> hard for identity preservation, so a provider's failure point
 * shows up as the row where results stop looking like the subject.
 */
export interface StylePrompt {
  slug: string;
  title: string;
  prompt: string;
  /** How much the style depends on an exact likeness surviving. */
  difficulty: "easy" | "medium" | "hard";
}

export const PROMPTS: StylePrompt[] = [
  {
    slug: "pencil-sketch",
    title: "Graphite Sketch",
    difficulty: "easy",
    prompt:
      "Redraw the person in this photo as a detailed graphite pencil sketch on textured paper. " +
      "Keep their exact facial features, hairstyle, and expression recognisable. " +
      "Use confident cross-hatching for shading and leave the background as bare paper.",
  },
  {
    slug: "oil-painting",
    title: "Renaissance Oil Portrait",
    difficulty: "easy",
    prompt:
      "Repaint the person in this photo as a 17th-century Dutch oil portrait with visible brushwork " +
      "and craquelure. Preserve their exact face shape, features, and expression. " +
      "Dramatic chiaroscuro lighting from the left, deep muted background.",
  },
  {
    slug: "pixar-3d",
    title: "3D Animated Character",
    difficulty: "medium",
    prompt:
      "Convert the person in this photo into a 3D animated film character with soft subsurface " +
      "skin shading and expressive stylised proportions. Keep their identity readable: same face " +
      "shape, hairstyle, eye colour, and expression. Warm cinematic key light, soft depth of field.",
  },
  {
    slug: "cyberpunk-neon",
    title: "Cyberpunk Neon",
    difficulty: "medium",
    prompt:
      "Restyle this photo as a cyberpunk portrait: the same person on a rain-slick neon street at " +
      "night, lit by magenta and cyan signage with wet reflections. Keep their exact facial " +
      "features and hairstyle unchanged. Cinematic 85mm look, shallow depth of field.",
  },
  {
    slug: "90s-yearbook",
    title: "90s Yearbook Photo",
    difficulty: "hard",
    prompt:
      "Restyle this photo as a 1990s high-school yearbook portrait: mottled blue-grey studio " +
      "backdrop, soft flash lighting, slight film grain and period colour cast. " +
      "Keep the person's face completely unchanged and photorealistic; change only the styling, " +
      "wardrobe, lighting, and background.",
  },
  {
    slug: "studio-headshot",
    title: "Corporate Headshot",
    difficulty: "hard",
    prompt:
      "Turn this photo into a professional corporate headshot. Keep the person's face, skin " +
      "texture, and expression photorealistic and completely unchanged. Replace the clothing with " +
      "smart business attire and the background with a clean neutral grey studio backdrop. " +
      "Soft large-softbox key light, subtle rim light, sharp focus on the eyes.",
  },
];

export const byslug = (slug: string) => PROMPTS.find((p) => p.slug === slug);
