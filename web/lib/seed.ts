import type { Prompt } from "./prompt";

/**
 * First-run contents of the local collection.
 *
 * Seeding happens once: after the store file exists this module is never
 * consulted again, so editing a seed here will not overwrite a prompt you have
 * since changed. A Supabase project is never seeded — it starts with whatever
 * you import or migrate into it.
 *
 * The set is chosen to show the shape of the library: every category, every
 * audience, both photo-edit prompts (paste with your own picture attached) and
 * text-only ones, and the tools each kind works best in.
 */

/** Fixed so a fresh seed is byte-identical between machines. */
const SEEDED_AT = "2026-10-23T00:00:00.000Z";

type SeedPrompt = Omit<Prompt, "favorite" | "copies" | "createdAt" | "updatedAt" | "source">;

/** For prompts that edit the visitor's own photo — the note they most need. */
const ATTACH = "Attach your photo in the same message before you send the prompt.";

const SEEDS: SeedPrompt[] = [
  {
    id: "corporate-headshot",
    title: "Corporate Headshot",
    summary: "Business attire on a clean grey backdrop",
    category: "portrait",
    audience: "any",
    models: ["chatgpt", "gemini"],
    tags: ["headshot", "linkedin", "photo-edit"],
    accent: "from-slate-500 to-slate-700",
    notes: `${ATTACH} A front-facing photo in even light keeps the face closest to yours.`,
    body:
      "Turn this photo into a professional corporate headshot. Keep my face, skin texture and " +
      "expression photorealistic and completely unchanged. Replace the clothing with smart " +
      "business attire and the background with a clean neutral grey studio backdrop. Soft " +
      "large-softbox key light, subtle rim light, sharp focus on the eyes, 85mm lens look.",
  },
  {
    id: "golden-hour-saree",
    title: "Golden Hour Saree",
    summary: "Flowing silk saree in warm sunset light",
    category: "fashion",
    audience: "female",
    models: ["gemini", "chatgpt"],
    tags: ["saree", "traditional", "photo-edit"],
    accent: "from-amber-700 to-yellow-900",
    notes: `${ATTACH} Swap the colour in brackets to match your style.`,
    body:
      "Using the woman in this photo, keep her face exactly the same and create a portrait of " +
      "her wearing an elegant [deep red] silk saree with a gold border, draped gracefully, " +
      "small gold jhumka earrings and loose wavy hair. She stands on a rooftop at golden hour, " +
      "warm sunlight from behind creating a soft glow, gentle breeze lifting the pallu. " +
      "Photorealistic, 4K, shallow depth of field, cinematic warm tones.",
  },
  {
    id: "retro-90s-film-portrait",
    title: "Retro 90s Film Portrait",
    summary: "Grainy film look with a vintage outfit",
    category: "portrait",
    audience: "female",
    models: ["gemini", "chatgpt"],
    tags: ["retro", "film", "photo-edit"],
    accent: "from-rose-500 to-orange-600",
    notes: ATTACH,
    body:
      "Recreate this photo as a 1990s film portrait of the same woman, keeping her face " +
      "unchanged. She wears an oversized denim jacket over a white top, with a loose claw-clip " +
      "hairstyle. Warm tungsten light against a plain textured wall, slight film grain, faded " +
      "colours and soft vignette, as if shot on 35mm Kodak Portra film.",
  },
  {
    id: "old-money-menswear",
    title: "Old Money Menswear",
    summary: "Quiet-luxury knitwear on a country estate",
    category: "fashion",
    audience: "male",
    models: ["gemini", "chatgpt"],
    tags: ["old-money", "luxury", "photo-edit"],
    accent: "from-emerald-500 to-lime-700",
    notes: ATTACH,
    body:
      "Using the man in this photo, keep his face, hairline and features exactly the same. " +
      "Dress him in a cream cable-knit sweater over a light blue oxford shirt, tailored beige " +
      "trousers and brown loafers. He stands in front of an old stone country house with a " +
      "neatly trimmed lawn, overcast soft daylight. Editorial fashion photo, natural colours, " +
      "photorealistic.",
  },
  {
    id: "cinematic-rain-portrait",
    title: "Cinematic Rain Portrait",
    summary: "Moody night street, neon reflections",
    category: "portrait",
    audience: "male",
    models: ["gemini", "chatgpt"],
    tags: ["cinematic", "night", "photo-edit"],
    accent: "from-fuchsia-500 to-cyan-500",
    notes: `${ATTACH} Works best with a photo where you are not smiling broadly.`,
    body:
      "Turn this photo into a cinematic movie still of the same man, face unchanged. He wears " +
      "a dark long coat and stands on a rain-soaked city street at night, raindrops falling, " +
      "neon signs in teal and magenta reflecting on the wet pavement. Low camera angle, " +
      "dramatic side light, anamorphic lens flare, film colour grading, ultra-detailed.",
  },
  {
    id: "couple-paris-night",
    title: "Couple Under Paris Lights",
    summary: "Romantic evening by the Eiffel Tower",
    category: "portrait",
    audience: "couple",
    models: ["gemini", "chatgpt"],
    tags: ["romantic", "travel", "photo-edit"],
    accent: "from-sky-400 to-indigo-600",
    notes: `${ATTACH} A photo with both faces clearly visible works best.`,
    body:
      "Using the couple in this photo, keep both of their faces exactly the same. Place them " +
      "on a Paris street at night with the illuminated Eiffel Tower behind them. She leans " +
      "into him, he holds an umbrella, soft string lights and bokeh in the background. Elegant " +
      "evening outfits, romantic warm atmosphere, photorealistic, cinematic composition.",
  },
  {
    id: "anime-character",
    title: "Anime Character",
    summary: "You, redrawn as a hand-painted anime still",
    category: "anime",
    audience: "any",
    models: ["chatgpt", "gemini"],
    tags: ["anime", "illustration", "photo-edit"],
    accent: "from-sky-400 to-indigo-600",
    notes: `${ATTACH} Keep the hairstyle and outfit details in the photo distinct — they carry the likeness in a drawn style.`,
    body:
      "Redraw this photo as a scene from a hand-painted Japanese anime film. Keep the person's " +
      "hairstyle, outfit and expression recognisable. Soft cel shading, clean line art, " +
      "expressive eyes, a lush painted background with fluffy summer clouds, warm afternoon " +
      "light.",
  },
  {
    id: "collectible-figurine",
    title: "Collectible Figurine",
    summary: "A 1/7 scale figure of you on a desk",
    category: "3d",
    audience: "any",
    models: ["gemini", "chatgpt"],
    tags: ["figurine", "toy", "photo-edit"],
    accent: "from-teal-500 to-blue-700",
    notes: ATTACH,
    body:
      "Create a 1/7 scale commercialised figurine of the person in this photo, in a realistic " +
      "style, standing on a computer desk. The figurine has a round transparent acrylic base " +
      "with no text. Next to it, the computer screen shows the 3D modelling process of the " +
      "figurine, and beside it is a toy packaging box printed with the original artwork. " +
      "Indoor setting, soft natural light, highly detailed.",
  },
  {
    id: "graphite-sketch",
    title: "Graphite Sketch",
    summary: "Hand-drawn portrait on textured paper",
    category: "art",
    audience: "any",
    models: [],
    tags: ["sketch", "pencil", "photo-edit"],
    accent: "from-stone-400 to-stone-600",
    notes: `${ATTACH} Drawn looks tolerate a rough likeness, so most tools do well here.`,
    body:
      "Redraw the person in this photo as a detailed graphite pencil sketch on textured paper. " +
      "Keep their exact facial features, hairstyle and expression recognisable. Use confident " +
      "cross-hatching for shading and leave the background as bare paper.",
  },
  {
    id: "elven-queen",
    title: "Elven Queen",
    summary: "Silver-crowned queen in an enchanted forest",
    category: "fantasy",
    audience: "female",
    models: ["midjourney", "flux", "stable-diffusion", "leonardo"],
    tags: ["elf", "magic", "text-to-image"],
    accent: "from-emerald-500 to-lime-700",
    notes: "Text only — no photo needed. In Midjourney, keep the --ar flag at the end.",
    body:
      "Portrait of an elven queen with long silver hair and a delicate crown of white branches, " +
      "flowing pale-green gown embroidered with leaves, standing in an ancient enchanted " +
      "forest, glowing fireflies and shafts of morning light through the mist, ethereal and " +
      "serene, highly detailed fantasy concept art --ar 2:3",
  },
  {
    id: "samurai-at-dawn",
    title: "Samurai at Dawn",
    summary: "Lone warrior on a misty mountain ridge",
    category: "fantasy",
    audience: "male",
    models: ["midjourney", "flux", "leonardo"],
    tags: ["samurai", "warrior", "text-to-image"],
    accent: "from-rose-500 to-orange-600",
    notes: "Text only — no photo needed.",
    body:
      "A lone samurai in weathered dark armour standing on a misty mountain ridge at dawn, " +
      "katana at his side, cherry blossom petals drifting in the wind, the rising sun behind " +
      "him casting a warm rim light, epic wide shot, cinematic, ultra-detailed, " +
      "photorealistic --ar 16:9",
  },
  {
    id: "misty-mountain-lake",
    title: "Misty Mountain Lake",
    summary: "Still alpine lake at sunrise",
    category: "landscape",
    audience: "any",
    models: ["midjourney", "flux", "stable-diffusion"],
    tags: ["nature", "wallpaper", "text-to-image"],
    accent: "from-teal-500 to-blue-700",
    notes: "Text only. Change --ar 16:9 to 9:16 for a phone wallpaper.",
    body:
      "A perfectly still alpine lake at sunrise, low mist drifting over the water, jagged snowy " +
      "peaks reflected in the surface, pine forest along the shore, soft pink and gold sky, " +
      "landscape photography, shot on a full-frame camera, 24mm, f/11, ultra-sharp " +
      "--ar 16:9",
  },
  {
    id: "floating-product-shot",
    title: "Floating Product Shot",
    summary: "Clean studio ad image for any product",
    category: "product",
    audience: "any",
    models: ["chatgpt", "gemini", "flux"],
    tags: ["advertising", "e-commerce"],
    accent: "from-slate-500 to-slate-700",
    notes:
      "Attach a photo of your product, or replace the bracketed text to describe it. Swap the " +
      "background colour to match your brand.",
    body:
      "A professional advertising photo of [my product in the attached photo], floating at a " +
      "slight angle above a pastel [peach] background, with soft drop shadow beneath it and a " +
      "few matching props floating around it. Clean studio lighting, high-end commercial look, " +
      "sharp focus, minimal composition.",
  },
  {
    id: "minimal-flat-logo",
    title: "Minimal Flat Logo",
    summary: "Simple vector logo with your brand name",
    category: "logo",
    audience: "any",
    models: ["ideogram", "chatgpt"],
    tags: ["branding", "vector"],
    accent: "from-fuchsia-500 to-cyan-500",
    notes:
      "Replace the bracketed parts. Ideogram and ChatGPT spell brand names far more reliably " +
      "than most image tools.",
    body:
      "A minimal flat vector logo for a brand called \"[BRAND NAME]\", a [coffee shop]. A simple " +
      "geometric icon of a [coffee bean forming a leaf] to the left of the name in a clean " +
      "modern sans-serif font. Two colours: [deep green] and [cream]. White background, " +
      "centred, no gradients, no mockup.",
  },
  {
    id: "royal-pet-portrait",
    title: "Royal Pet Portrait",
    summary: "Your pet as a Renaissance noble",
    category: "animals",
    audience: "any",
    models: ["chatgpt", "gemini"],
    tags: ["pet", "painting", "photo-edit"],
    accent: "from-amber-700 to-yellow-900",
    notes: "Attach a clear photo of your pet's face.",
    body:
      "Repaint the pet in this photo as a noble in a 17th-century royal oil portrait. Keep its " +
      "exact face, fur colour and markings. It wears an embroidered velvet cape with a fur " +
      "collar and a jewelled medallion, seated on a red velvet cushion. Dark, rich background, " +
      "dramatic chiaroscuro lighting, visible brushwork and craquelure.",
  },
  {
    id: "moody-food-photo",
    title: "Moody Food Photography",
    summary: "Dark, rustic restaurant-menu shot",
    category: "food",
    audience: "any",
    models: ["midjourney", "flux"],
    tags: ["restaurant", "menu", "text-to-image"],
    accent: "from-stone-400 to-stone-600",
    notes: "Text only. Replace the dish in brackets.",
    body:
      "Overhead shot of [a bowl of spicy ramen with a soft-boiled egg] on a dark rustic wooden " +
      "table, chopsticks resting on the side, a little steam rising, scattered spring onions " +
      "and chilli flakes, low-key moody lighting from one side, deep shadows, professional " +
      "food photography, 50mm --ar 4:5",
  },
  {
    id: "scandinavian-living-room",
    title: "Scandinavian Living Room",
    summary: "Bright, calm interior design render",
    category: "architecture",
    audience: "any",
    models: ["midjourney", "stable-diffusion", "flux"],
    tags: ["interior", "home", "text-to-image"],
    accent: "from-emerald-500 to-lime-700",
    notes: "Text only. Good for trying out room ideas before you buy anything.",
    body:
      "A bright Scandinavian living room with large windows, light oak floor, a low cream " +
      "boucle sofa, a round wooden coffee table, linen curtains, a few green plants and a " +
      "woven rug, soft morning daylight, calm and minimal, interior design magazine " +
      "photography, wide angle --ar 3:2",
  },
];

export function seedPrompts(): Prompt[] {
  return SEEDS.map((seed, index) => ({
    ...seed,
    source: "",
    favorite: false,
    copies: 0,
    createdAt: SEEDED_AT,
    // Spread by a second each so "recent" has a stable, meaningful order.
    updatedAt: new Date(Date.parse(SEEDED_AT) + index * 1000).toISOString(),
  }));
}
