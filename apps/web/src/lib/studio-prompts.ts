// Нэг загвар (BASE) + ангилал тус бүрийн PRESENTATION. Студио зураг үүсгэхэд
// барааны ангилалаас хамаарч тохирох prompt-ыг автоматаар угсарна.

function base(product: string, presentation: string): string {
  return `Edit this photo into a professional e-commerce product image.
PRODUCT: ${product}.
BACKGROUND: clean seamless pure-white (#FFFFFF) studio background.
LIGHTING: soft even studio lighting with a subtle natural contact shadow under the product.
FRAMING: center the product, fill ~85% of the frame, perfectly upright, sharp focus, square 1:1.
PRESENTATION: ${presentation}.
CLEANUP: remove all background clutter, hands, props, price tags and watermarks.
KEEP: do not alter the product — keep its exact shape, colour, material, proportions, labels and printed text. Do not add any text, logo or graphics.
OUTPUT: photorealistic, high resolution.`;
}

const PRESENTATION: Record<string, { product: string; presentation: string }> = {
  будаг: { product: 'a paint can or bucket', presentation: 'keep it upright with the front label fully readable and undistorted; add a soft glossy reflection on the floor' },
  цемент: { product: 'a cement or mortar bag', presentation: 'show the full bag at a natural slight angle with the printed brand and weight text sharp and readable; no spilled powder' },
  сантехник: { product: 'a chrome metal faucet or mixer', presentation: '3/4 angle with clean controlled metallic reflections, bright but not blown-out highlights, showing the polished surface' },
  багаж: { product: 'a power tool (drill, grinder, saw, welder or cutter)', presentation: 'dynamic 3/4 hero angle showing the body, grip, buttons and the working head (bit, disc, chain or nozzle); keep model numbers readable' },
  цахилгаан: { product: 'an electrical item (cable coil, socket, switch, breaker or battery)', presentation: 'present it front-facing at a slight angle showing terminals and rating markings, or cable coiled tidily' },
  гэрэл: { product: 'a light fixture, lamp or LED bulb', presentation: 'clean 3/4 angle; optionally a soft realistic glow without overexposure' },
  обой: { product: 'a single wallpaper roll', presentation: 'stand the roll upright partially unrolled so the surface pattern shows; LOCK THE PATTERN — keep the exact pattern, texture, embossing and colour pixel-for-pixel, do not redraw, regenerate or stylise the surface' },
  кафель: { product: 'a ceramic or porcelain tile', presentation: 'show the tile face-on or at a 15-degree tilt so its surface pattern, colour and finish are fully visible with no harsh glare; do not redraw or stylise the surface pattern' },
  ламинат: { product: 'a laminate or parquet flooring plank or sample', presentation: 'slight 3/4 angle revealing the wood-grain surface and the click-edge profile; keep the exact grain and tone, do not regenerate the texture' },
  тоосго: { product: 'a brick or building block', presentation: 'a single unit or a neat small stack at a 3/4 angle showing the texture, holes or cores and true colour' },
  төмөр: { product: 'a long metal item (rebar, profile or steel tube)', presentation: 'place it diagonally across the frame showing the cross-section end and the ribbed or galvanised surface with controlled reflections' },
  мод: { product: 'a wood board, plywood or OSB sheet', presentation: '3/4 angle revealing the face grain and the edge layers; keep the natural wood tone, do not regenerate the texture' },
  дээвэр: { product: 'a roofing or facade sheet', presentation: '3/4 angle so the corrugation or profile and the colour are clearly visible along its length' },
  дулаалга: { product: 'insulation material (foam board, rockwool or glasswool)', presentation: '3/4 angle revealing its thickness and the fibrous or cellular texture' },
  бусад: { product: 'this product', presentation: 'a clean 3/4 hero angle that best shows the product’s overall form and key details' },
};

/** Барааны ангилал (+ нэр)-аас тохирох студио prompt угсарна. */
export function buildStudioPrompt(category?: string | null, label?: string | null): string {
  const key = (category ?? '').toLowerCase().trim();
  const entry = PRESENTATION[key] ?? PRESENTATION['бусад'];
  const product = label ? `${label} (${entry.product})` : entry.product;
  return base(product, entry.presentation);
}

export const STUDIO_CATEGORY_KEYS = Object.keys(PRESENTATION);
