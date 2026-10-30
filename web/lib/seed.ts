import { toModels, type Prompt } from "./prompt";

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

  // --- Added 2026-10-30: more for women, men and couples -----------------------
  {
    id: "myanmar-thanaka-portrait",
    title: "Thanaka Portrait in Bagan",
    summary: "Traditional Myanmar dress and thanaka among the temples",
    category: "fashion",
    audience: "female",
    models: ["chatgpt", "gemini"],
    tags: ["myanmar", "traditional", "photo-edit"],
    accent: "from-amber-700 to-yellow-900",
    notes: `${ATTACH} Change the htamein colour in the brackets to match an outfit you own.`,
    body:
      "Using the woman in this photo, keep her face, skin tone and features exactly the same. " +
      "Dress her in a traditional Myanmar outfit: a fitted [deep red silk] htamein with a gold " +
      "woven border and a cream lace eingyi blouse, hair in a neat bun with jasmine flowers. " +
      "Add soft circles of thanaka paste on her cheeks. Place her among the ancient temples of " +
      "Bagan at golden hour, warm dusty light, temples fading into the haze behind her, " +
      "editorial portrait, 85mm lens, shallow depth of field.",
  },
  {
    id: "vintage-hollywood-glamour",
    title: "Vintage Hollywood Glamour",
    summary: "1950s black-and-white studio star portrait",
    category: "portrait",
    audience: "female",
    models: ["chatgpt", "gemini"],
    tags: ["vintage", "black-and-white", "photo-edit"],
    accent: "from-slate-500 to-slate-700",
    notes: `${ATTACH} Works best with a photo where your face is turned slightly to one side.`,
    body:
      "Turn this photo into a 1950s Hollywood studio glamour portrait. Keep her face and " +
      "features exactly the same. Soft finger-wave curls, satin evening gown, pearl earrings. " +
      "Classic black-and-white film look, dramatic butterfly lighting from above, deep shadows, " +
      "smooth studio backdrop with a soft vignette, fine film grain.",
  },
  {
    id: "y2k-polaroid-selfie",
    title: "Y2K Polaroid Selfie",
    summary: "Early-2000s flash photo in a Polaroid frame",
    category: "portrait",
    audience: "female",
    models: ["chatgpt", "gemini"],
    tags: ["y2k", "retro", "photo-edit"],
    accent: "from-fuchsia-500 to-cyan-500",
    notes: `${ATTACH} A casual, close-up selfie gives the most authentic result.`,
    body:
      "Recreate this photo as an early-2000s Polaroid snapshot. Keep my face exactly the same. " +
      "Harsh on-camera flash, slightly washed-out colours, butterfly hair clips, glossy lip " +
      "gloss, a sparkly baby tee. Inside a white instant-film frame with [Best day ever!] " +
      "written in marker on the bottom border.",
  },
  {
    id: "kdrama-cafe-scene",
    title: "K-Drama Café Scene",
    summary: "Soft, dreamy still from a romance drama",
    category: "portrait",
    audience: "female",
    models: ["chatgpt", "gemini"],
    tags: ["k-drama", "cinematic", "photo-edit"],
    accent: "from-sky-400 to-indigo-600",
    notes: ATTACH,
    body:
      "Using the woman in this photo, keep her face exactly the same and place her in a scene " +
      "from a Korean romance drama. She sits by the window of a cosy café on a rainy afternoon, " +
      "holding a warm latte, wearing a cream knitted cardigan. Soft diffused window light, " +
      "pastel colour grade, gentle bokeh of raindrops on the glass, cinematic 16:9 still.",
  },
  {
    id: "flower-crown-dream",
    title: "Ethereal Flower Crown",
    summary: "Dreamy portrait in a meadow of wildflowers",
    category: "fantasy",
    audience: "female",
    models: ["midjourney", "flux", "leonardo"],
    tags: ["dreamy", "flowers", "text-to-image"],
    accent: "from-rose-500 to-orange-600",
    notes: "Text only. Change [auburn] to describe the hair you want.",
    body:
      "Ethereal portrait of a young woman with long [auburn] hair wearing a crown of wild roses " +
      "and baby's breath, standing in a misty meadow of wildflowers at dawn, flowing white " +
      "linen dress, soft backlight glowing through her hair, pastel palette, fine-art " +
      "photography, dreamy and romantic --ar 4:5",
  },
  {
    id: "magical-girl-anime",
    title: "Magical Girl Transformation",
    summary: "You as a sparkling anime magical girl",
    category: "anime",
    audience: "female",
    models: ["chatgpt", "gemini"],
    tags: ["anime", "magical", "photo-edit"],
    accent: "from-fuchsia-500 to-cyan-500",
    notes: `${ATTACH} Change the colour theme in the brackets to your favourite.`,
    body:
      "Redraw the woman in this photo as a 1990s-style anime magical girl in mid-transformation. " +
      "Keep her hairstyle and recognisable facial features. A [pink and gold] outfit with a " +
      "big ribbon, a crescent-moon wand, swirling ribbons of light and sparkles around her, " +
      "glittering starry background, cel-shaded anime art with bold outlines.",
  },
  {
    id: "minimal-mirror-outfit",
    title: "Minimal Outfit Mirror Shot",
    summary: "Clean, neutral-toned outfit photo for social media",
    category: "fashion",
    audience: "female",
    models: ["chatgpt", "gemini"],
    tags: ["outfit", "minimal", "photo-edit"],
    accent: "from-stone-400 to-stone-600",
    notes: `${ATTACH} Describe the outfit you want in the brackets.`,
    body:
      "Using the woman in this photo, keep her face and body shape exactly the same. Show her " +
      "taking a full-length mirror selfie in a bright, minimal apartment, wearing [a beige " +
      "trench coat, white tee, straight-leg jeans and white sneakers]. Neutral tones, soft " +
      "natural window light, clean white walls, a potted olive tree, a quiet-luxury aesthetic.",
  },
  {
    id: "myanmar-taikpon-look",
    title: "Traditional Taikpon Look",
    summary: "Myanmar men's traditional dress at Shwedagon",
    category: "fashion",
    audience: "male",
    models: ["chatgpt", "gemini"],
    tags: ["myanmar", "traditional", "photo-edit"],
    accent: "from-amber-700 to-yellow-900",
    notes: `${ATTACH} Change the paso colour in the brackets to suit you.`,
    body:
      "Using the man in this photo, keep his face, skin tone and features exactly the same. " +
      "Dress him in traditional Myanmar men's attire: a crisp white collarless shirt under a " +
      "light taikpon jacket, a [deep green checked] silk paso, and a neat gaung baung head " +
      "wrap. Place him on the terrace of the Shwedagon Pagoda at sunset, golden stupa glowing " +
      "behind him, warm light, respectful and dignified pose, editorial portrait.",
  },
  {
    id: "streetwear-lookbook",
    title: "Streetwear Lookbook",
    summary: "Urban fashion shoot on a city rooftop",
    category: "fashion",
    audience: "male",
    models: ["chatgpt", "gemini"],
    tags: ["streetwear", "urban", "photo-edit"],
    accent: "from-slate-500 to-slate-700",
    notes: ATTACH,
    body:
      "Using the man in this photo, keep his face exactly the same and dress him in modern " +
      "streetwear: an oversized black hoodie, cargo pants, chunky sneakers and a silver chain. " +
      "He stands on a city rooftop at dusk, the skyline lit up behind him. Moody blue hour " +
      "light, a subtle flash on him, editorial streetwear lookbook photography, low angle.",
  },
  {
    id: "cyberpunk-rider",
    title: "Cyberpunk Rider",
    summary: "Neon-lit motorbike in a futuristic city",
    category: "fantasy",
    audience: "male",
    models: ["chatgpt", "gemini"],
    tags: ["cyberpunk", "neon", "photo-edit"],
    accent: "from-fuchsia-500 to-cyan-500",
    notes: ATTACH,
    body:
      "Using the man in this photo, keep his face exactly the same. Put him on a futuristic " +
      "motorbike in a rain-soaked cyberpunk city at night, wearing a black techwear jacket " +
      "with glowing cyan seams. Neon signs in pink and teal reflected on the wet street, " +
      "light rain, cinematic wide shot, high contrast.",
  },
  {
    id: "mountain-explorer",
    title: "Mountain Explorer",
    summary: "Adventure shot at the summit",
    category: "portrait",
    audience: "male",
    models: ["chatgpt", "gemini"],
    tags: ["adventure", "outdoor", "photo-edit"],
    accent: "from-teal-500 to-blue-700",
    notes: ATTACH,
    body:
      "Using the man in this photo, keep his face exactly the same. Show him standing on a " +
      "rocky summit above a sea of clouds at sunrise, wearing a red technical jacket and a " +
      "backpack, wind in his hair, looking out at the view. Epic adventure photography, " +
      "golden light, crisp detail, wide-angle lens.",
  },
  {
    id: "comic-hero-cover",
    title: "Comic Book Hero Cover",
    summary: "You on the cover of a retro comic",
    category: "art",
    audience: "male",
    models: ["chatgpt", "gemini"],
    tags: ["comic", "illustration", "photo-edit"],
    accent: "from-rose-500 to-orange-600",
    notes: `${ATTACH} Put your own hero name in the brackets.`,
    body:
      "Redraw the man in this photo as the hero on the cover of a vintage 1960s comic book. " +
      "Keep his face recognisable. A dynamic flying pose in an original costume with a flowing " +
      "cape, the title [THE NIGHT GUARDIAN] in bold retro lettering, halftone dot shading, " +
      "bright primary colours, a price box in the corner, worn paper texture.",
  },
  {
    id: "bagan-balloon-couple",
    title: "Bagan Balloons at Sunrise",
    summary: "A couple watching hot-air balloons over the temples",
    category: "portrait",
    audience: "couple",
    models: ["chatgpt", "gemini"],
    tags: ["myanmar", "travel", "photo-edit"],
    accent: "from-amber-700 to-yellow-900",
    notes: `${ATTACH} Use a photo where both faces are clearly visible.`,
    body:
      "Using the couple in this photo, keep both of their faces exactly the same. Place them " +
      "sitting close together on top of an ancient temple in Bagan at sunrise, wrapped in one " +
      "blanket, watching dozens of hot-air balloons drift over the misty plain dotted with " +
      "pagodas. Warm golden light, soft haze, romantic travel photography, shot from behind " +
      "and slightly to the side.",
  },
  {
    id: "rainy-umbrella-anime-couple",
    title: "Rainy Day Anime Couple",
    summary: "Sharing an umbrella in a hand-painted anime scene",
    category: "anime",
    audience: "couple",
    models: ["chatgpt", "gemini"],
    tags: ["anime", "romantic", "photo-edit"],
    accent: "from-sky-400 to-indigo-600",
    notes: ATTACH,
    body:
      "Redraw the couple in this photo as a scene from a hand-painted anime film. Keep their " +
      "hairstyles and recognisable features. They share one clear umbrella on a quiet street " +
      "after school, light rain, puddles reflecting warm shop lights, cherry blossom petals " +
      "on the wet pavement, soft watercolour backgrounds, gentle and nostalgic mood.",
  },
  {
    id: "myanmar-wedding-preshoot",
    title: "Myanmar Wedding Pre-Shoot",
    summary: "Traditional wedding outfits in a royal palace setting",
    category: "fashion",
    audience: "couple",
    models: ["chatgpt", "gemini"],
    tags: ["myanmar", "wedding", "photo-edit"],
    accent: "from-rose-500 to-orange-600",
    notes: `${ATTACH} Both faces should be clearly visible and well lit.`,
    body:
      "Using the couple in this photo, keep both faces exactly the same. Dress them in " +
      "traditional Myanmar wedding attire: the bride in an ivory and gold silk htamein with an " +
      "embroidered jacket and gold jewellery, the groom in a white taikpon with a gold " +
      "patterned paso and gaung baung. Pose them in a carved teak palace hall with gilded " +
      "pillars, soft warm lighting, elegant wedding photography.",
  },
  {
    id: "cozy-winter-couple",
    title: "Cosy Winter Cabin",
    summary: "Matching sweaters by a crackling fireplace",
    category: "portrait",
    audience: "couple",
    models: ["chatgpt", "gemini"],
    tags: ["winter", "cozy", "photo-edit"],
    accent: "from-amber-700 to-yellow-900",
    notes: ATTACH,
    body:
      "Using the couple in this photo, keep both faces exactly the same. Put them in a wooden " +
      "cabin on a snowy evening, wearing matching knitted sweaters, sharing a blanket on the " +
      "sofa with mugs of hot chocolate. A crackling fireplace, fairy lights, snow falling " +
      "outside the window, warm candid lifestyle photography.",
  },
  {
    id: "chibi-sticker",
    title: "Chibi Sticker of You",
    summary: "A cute die-cut sticker with a big head",
    category: "art",
    audience: "any",
    models: ["chatgpt", "gemini"],
    tags: ["chibi", "sticker", "photo-edit"],
    accent: "from-fuchsia-500 to-cyan-500",
    notes: `${ATTACH} Change the pose in the brackets — waving, peace sign, holding coffee.`,
    body:
      "Turn the person in this photo into a cute chibi sticker. Keep their hairstyle, glasses " +
      "and outfit colours so it is clearly them. Big head, small body, [waving happily], " +
      "simple flat colours with soft shading, a thick white die-cut border, on a plain white " +
      "background.",
  },
  {
    id: "isometric-dream-room",
    title: "Isometric Dream Room",
    summary: "A tiny 3D room you could hold in your hand",
    category: "3d",
    audience: "any",
    models: ["midjourney", "flux", "chatgpt"],
    tags: ["isometric", "cute", "text-to-image"],
    accent: "from-sky-400 to-indigo-600",
    notes: "Text only. Describe the room you want in the brackets.",
    body:
      "A cute isometric 3D diorama of [a cosy gamer bedroom with a desk, glowing monitor, " +
      "plants and a cat asleep on the bed], cut-away walls, soft clay render, pastel colours, " +
      "warm lamp light, tiny detailed props, centred on a plain background --ar 1:1",
  },
  {
    id: "mohinga-breakfast",
    title: "Steaming Bowl of Mohinga",
    summary: "Myanmar's favourite breakfast, food-magazine style",
    category: "food",
    audience: "any",
    models: ["midjourney", "flux", "chatgpt"],
    tags: ["myanmar", "food", "text-to-image"],
    accent: "from-amber-700 to-yellow-900",
    notes: "Text only.",
    body:
      "A steaming bowl of Myanmar mohinga, rice noodles in a rich golden fish and lemongrass " +
      "broth, topped with crispy fritters, a sliced boiled egg, fresh coriander and a wedge " +
      "of lime, on a wooden table at an early-morning street stall, soft morning light, " +
      "rising steam, food magazine photography, shallow depth of field --ar 4:5",
  },
  {
    id: "golden-retriever-astronaut",
    title: "Golden Retriever Astronaut",
    summary: "A very good boy floating in space",
    category: "animals",
    audience: "any",
    models: ["midjourney", "flux", "leonardo"],
    tags: ["dog", "space", "text-to-image"],
    accent: "from-sky-400 to-indigo-600",
    notes: "Text only. Swap in your own pet's breed.",
    body:
      "A golden retriever in a white astronaut suit with a glass helmet, floating weightless " +
      "inside a space station, Earth visible through the round window behind it, tongue out " +
      "and happy, soft cinematic lighting, highly detailed, photorealistic --ar 3:2",
  },
  {
    id: "tropical-modern-villa",
    title: "Tropical Modern Villa",
    summary: "Concrete, glass and palms by an infinity pool",
    category: "architecture",
    audience: "any",
    models: ["midjourney", "flux", "stable-diffusion"],
    tags: ["villa", "interior", "text-to-image"],
    accent: "from-emerald-500 to-lime-700",
    notes: "Text only.",
    body:
      "A modern tropical villa with board-formed concrete walls and floor-to-ceiling glass, an " +
      "infinity pool reflecting palm trees, open-plan living area with teak furniture, lush " +
      "jungle all around, late afternoon sun, architectural photography, wide angle " +
      "--ar 16:9",
  },
  {
    id: "luxury-perfume-shot",
    title: "Luxury Perfume Shot",
    summary: "Premium bottle on water with soft reflections",
    category: "product",
    audience: "any",
    models: ["chatgpt", "gemini", "flux"],
    tags: ["advertising", "luxury", "e-commerce"],
    accent: "from-rose-500 to-orange-600",
    notes: "Attach a photo of your product, or describe it in the brackets for text only.",
    body:
      "A premium advertising photo of [a square glass perfume bottle with a gold cap], standing " +
      "on still water with gentle ripples, soft reflections, scattered rose petals floating " +
      "nearby, a warm gradient background from peach to deep rose, glossy highlights, luxury " +
      "commercial product photography, centred composition --ar 4:5",
  },
];

export function seedPrompts(): Prompt[] {
  return SEEDS.map((seed, index) => ({
    ...seed,
    // In AI_TOOLS order, as every saved prompt is. Left as written here, the
    // first edit of a seed reordered its tools (and with them the paste hint),
    // and toggling a tool in the form flagged unsaved changes that were none.
    models: toModels(seed.models),
    source: "",
    favorite: false,
    copies: 0,
    createdAt: SEEDED_AT,
    // Spread by a second each so "recent" has a stable, meaningful order.
    updatedAt: new Date(Date.parse(SEEDED_AT) + index * 1000).toISOString(),
  }));
}
