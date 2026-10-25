import { FilterDefinition, FilterCategory } from './types';

export interface CategoryInfo {
  id: FilterCategory;
  name: string;
  icon: string;
}

export const FILTER_CATEGORIES: CategoryInfo[] = [
  { id: 'beauty', name: 'Beauty & Skin', icon: '✨' },
  { id: 'aesthetic', name: 'Aesthetic & Color', icon: '🎨' },
  { id: 'cinematic', name: 'Cinematic & Film', icon: '🎬' },
  { id: 'retro', name: 'Retro & Vintage', icon: '📼' },
  { id: 'face', name: 'Face Effects', icon: '💄' },
  { id: 'accessories', name: 'Glasses & Accessories', icon: '👓' },
  { id: 'fantasy', name: 'Fantasy & Anime', icon: '🔮' },
  { id: 'light', name: 'Light & Glow', icon: '☀️' },
  { id: 'distortion', name: 'Fun & Distortion', icon: '🤪' },
  { id: 'nature', name: 'Nature & Seasonal', icon: '🌸' },
];

export const FILTERS_CATALOG: FilterDefinition[] = [
  // =========================================================================
  // CATEGORY 1: BEAUTY & SKIN (20 Filters)
  // =========================================================================
  {
    id: 'beauty-natural',
    name: 'Natural Beauty',
    category: 'beauty',
    thumbnail: 'filter:beauty-natural',
    effectType: 'color-grade',
    parameters: { brightness: 0.06, contrast: 0.96, saturation: 1.05, skinSoftness: 0.25, warmth: 0.03 },
    performanceTier: 'light',
    enabled: true,
    description: 'Subtle skin softening with radiant, natural skin tones.'
  },
  {
    id: 'beauty-soft-skin',
    name: 'Soft Skin',
    category: 'beauty',
    thumbnail: 'filter:beauty-soft-skin',
    effectType: 'color-grade',
    parameters: { brightness: 0.08, contrast: 0.92, saturation: 1.03, skinSoftness: 0.65, warmth: 0.05 },
    performanceTier: 'light',
    enabled: true,
    description: 'Gentle blurring of skin imperfections with warm undertones.'
  },
  {
    id: 'beauty-radiance',
    name: 'Radiance',
    category: 'beauty',
    thumbnail: 'filter:beauty-radiance',
    effectType: 'color-grade',
    parameters: { brightness: 0.12, contrast: 1.02, saturation: 1.08, bloom: 0.35, warmth: 0.04 },
    performanceTier: 'light',
    enabled: true,
    description: 'Illuminated highlights and luminescent skin radiance.'
  },
  {
    id: 'beauty-gentle-glow',
    name: 'Gentle Glow',
    category: 'beauty',
    thumbnail: 'filter:beauty-gentle-glow',
    effectType: 'color-grade',
    parameters: { brightness: 0.07, contrast: 0.94, saturation: 1.06, bloom: 0.28, warmth: 0.08 },
    performanceTier: 'light',
    enabled: true,
    description: 'Soft diffusion with a golden ambient warmth.'
  },
  {
    id: 'beauty-smooth-portrait',
    name: 'Smooth Portrait',
    category: 'beauty',
    thumbnail: 'filter:beauty-smooth-portrait',
    effectType: 'color-grade',
    parameters: { brightness: 0.05, contrast: 0.93, saturation: 1.02, skinSoftness: 0.75, vignette: 0.2 },
    performanceTier: 'light',
    enabled: true,
    description: 'Silky skin smoothing and gentle portrait vignette.'
  },
  {
    id: 'beauty-fresh-face',
    name: 'Fresh Face',
    category: 'beauty',
    thumbnail: 'filter:beauty-fresh-face',
    effectType: 'color-grade',
    parameters: { brightness: 0.09, contrast: 0.98, saturation: 1.12, tintPink: 0.07, warmth: 0.02 },
    performanceTier: 'light',
    enabled: true,
    description: 'Awake, vibrant skin tone with a fresh pink blush lift.'
  },
  {
    id: 'beauty-soft-focus',
    name: 'Soft Focus',
    category: 'beauty',
    thumbnail: 'filter:beauty-soft-focus',
    effectType: 'color-grade',
    parameters: { brightness: 0.06, contrast: 0.9, saturation: 0.98, peripheralBlur: 0.45, bloom: 0.2 },
    performanceTier: 'light',
    enabled: true,
    description: 'Dreamy soft focus across the portrait perimeter.'
  },
  {
    id: 'beauty-bright-portrait',
    name: 'Bright Portrait',
    category: 'beauty',
    thumbnail: 'filter:beauty-bright-portrait',
    effectType: 'color-grade',
    parameters: { brightness: 0.16, contrast: 1.04, saturation: 1.04, shadowLift: 0.25 },
    performanceTier: 'light',
    enabled: true,
    description: 'Clean shadow lift for high-key portrait illumination.'
  },
  {
    id: 'beauty-warm-beauty',
    name: 'Warm Beauty',
    category: 'beauty',
    thumbnail: 'filter:beauty-warm-beauty',
    effectType: 'color-grade',
    parameters: { brightness: 0.05, contrast: 0.98, saturation: 1.08, warmth: 0.16, skinSoftness: 0.3 },
    performanceTier: 'light',
    enabled: true,
    description: 'Golden hour skin warmth with soft midtone transitions.'
  },
  {
    id: 'beauty-cool-beauty',
    name: 'Cool Beauty',
    category: 'beauty',
    thumbnail: 'filter:beauty-cool-beauty',
    effectType: 'color-grade',
    parameters: { brightness: 0.08, contrast: 0.97, saturation: 0.95, coolness: 0.14, skinSoftness: 0.4 },
    performanceTier: 'light',
    enabled: true,
    description: 'Porcelain cool-toned complexion with muted red undertones.'
  },
  {
    id: 'beauty-dewy-glow',
    name: 'Dewy Glow',
    category: 'beauty',
    thumbnail: 'filter:beauty-dewy-glow',
    effectType: 'color-grade',
    parameters: { brightness: 0.1, contrast: 1.02, saturation: 1.1, bloom: 0.45, specularBoost: 0.3 },
    performanceTier: 'light',
    enabled: true,
    description: 'High-gloss dewy skin finish with glistening cheekbones.'
  },
  {
    id: 'beauty-matte-portrait',
    name: 'Matte Portrait',
    category: 'beauty',
    thumbnail: 'filter:beauty-matte-portrait',
    effectType: 'color-grade',
    parameters: { brightness: 0.02, contrast: 0.95, saturation: 0.98, matteFinish: 0.5, skinSoftness: 0.5 },
    performanceTier: 'light',
    enabled: true,
    description: 'Powder-soft matte finish reducing oily reflections.'
  },
  {
    id: 'beauty-golden-beauty',
    name: 'Golden Beauty',
    category: 'beauty',
    thumbnail: 'filter:beauty-golden-beauty',
    effectType: 'color-grade',
    parameters: { brightness: 0.06, contrast: 1.02, saturation: 1.14, warmth: 0.22, goldenTint: 0.18 },
    performanceTier: 'light',
    enabled: true,
    description: 'Lustrous bronze and honey tones for a sun-kissed look.'
  },
  {
    id: 'beauty-rose-beauty',
    name: 'Rose Beauty',
    category: 'beauty',
    thumbnail: 'filter:beauty-rose-beauty',
    effectType: 'color-grade',
    parameters: { brightness: 0.06, contrast: 0.95, saturation: 1.08, tintPink: 0.14, bloom: 0.2 },
    performanceTier: 'light',
    enabled: true,
    description: 'Romantic rose petal tones and gentle blush enhancement.'
  },
  {
    id: 'beauty-peach-beauty',
    name: 'Peach Beauty',
    category: 'beauty',
    thumbnail: 'filter:beauty-peach-beauty',
    effectType: 'color-grade',
    parameters: { brightness: 0.07, contrast: 0.94, saturation: 1.1, peachTint: 0.16, warmth: 0.08 },
    performanceTier: 'light',
    enabled: true,
    description: 'Soft peach blush with pastel midtone softening.'
  },
  {
    id: 'beauty-clean-portrait',
    name: 'Clean Portrait',
    category: 'beauty',
    thumbnail: 'filter:beauty-clean-portrait',
    effectType: 'color-grade',
    parameters: { brightness: 0.08, contrast: 1.06, saturation: 1.02, clarity: 0.15, neutralBalance: 0.1 },
    performanceTier: 'light',
    enabled: true,
    description: 'Neutral white-balanced portrait with crisp studio clarity.'
  },
  {
    id: 'beauty-natural-light',
    name: 'Natural Light',
    category: 'beauty',
    thumbnail: 'filter:beauty-natural-light',
    effectType: 'color-grade',
    parameters: { brightness: 0.1, contrast: 0.98, saturation: 1.04, windowDiffuse: 0.25 },
    performanceTier: 'light',
    enabled: true,
    description: 'Daylight window illumination with gentle ambient fill.'
  },
  {
    id: 'beauty-soft-highlight',
    name: 'Soft Highlight',
    category: 'beauty',
    thumbnail: 'filter:beauty-soft-highlight',
    effectType: 'color-grade',
    parameters: { brightness: 0.04, contrast: 0.92, saturation: 1.02, highlightRollOff: 0.4 },
    performanceTier: 'light',
    enabled: true,
    description: 'Controlled highlight roll-off preventing skin blowouts.'
  },
  {
    id: 'beauty-velvet-tone',
    name: 'Velvet Tone',
    category: 'beauty',
    thumbnail: 'filter:beauty-velvet-tone',
    effectType: 'color-grade',
    parameters: { brightness: 0.02, contrast: 1.04, saturation: 1.05, velvetMidtones: 0.35, vignette: 0.25 },
    performanceTier: 'light',
    enabled: true,
    description: 'Deep velvet contrast with smooth skin tonal graduation.'
  },
  {
    id: 'beauty-studio-beauty',
    name: 'Studio Beauty',
    category: 'beauty',
    thumbnail: 'filter:beauty-studio-beauty',
    effectType: 'color-grade',
    parameters: { brightness: 0.12, contrast: 1.08, saturation: 1.06, rimLightGlow: 0.2, skinSoftness: 0.3 },
    performanceTier: 'light',
    enabled: true,
    description: 'Three-point studio lighting simulation with rim light.'
  },

  // =========================================================================
  // CATEGORY 2: AESTHETIC & COLOR (20 Filters)
  // =========================================================================
  {
    id: 'aesthetic-warm',
    name: 'Warm Aesthetic',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-warm',
    effectType: 'color-grade',
    parameters: { warmth: 0.2, saturation: 1.08, contrast: 1.02, amberTint: 0.12 },
    performanceTier: 'light',
    enabled: true,
    description: 'Cozy honey-amber tones with subdued cool colors.'
  },
  {
    id: 'aesthetic-cool-tone',
    name: 'Cool Tone',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-cool-tone',
    effectType: 'color-grade',
    parameters: { coolness: 0.22, saturation: 0.92, contrast: 1.04, cyanTint: 0.15 },
    performanceTier: 'light',
    enabled: true,
    description: 'Nordic glacial blue with muted yellow and green.'
  },
  {
    id: 'aesthetic-pastel-dream',
    name: 'Pastel Dream',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-pastel-dream',
    effectType: 'color-grade',
    parameters: { brightness: 0.08, contrast: 0.88, saturation: 1.15, pastelShift: 0.3 },
    performanceTier: 'light',
    enabled: true,
    description: 'Muted cotton-candy pastels with low-contrast softness.'
  },
  {
    id: 'aesthetic-soft-pink',
    name: 'Soft Pink',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-soft-pink',
    effectType: 'color-grade',
    parameters: { tintPink: 0.22, warmth: 0.05, contrast: 0.94, saturation: 1.08 },
    performanceTier: 'light',
    enabled: true,
    description: 'Blush pink wash across shadows and midtones.'
  },
  {
    id: 'aesthetic-lavender-haze',
    name: 'Lavender Haze',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-lavender-haze',
    effectType: 'color-grade',
    parameters: { violetTint: 0.24, brightness: 0.05, contrast: 0.92, saturation: 1.05 },
    performanceTier: 'light',
    enabled: true,
    description: 'Ethereal lavender purple haze with gentle contrast.'
  },
  {
    id: 'aesthetic-muted-beige',
    name: 'Muted Beige',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-muted-beige',
    effectType: 'color-grade',
    parameters: { beigeShift: 0.28, saturation: 0.84, contrast: 0.96, warmth: 0.08 },
    performanceTier: 'light',
    enabled: true,
    description: 'Minimalist earthy beige and linen tones.'
  },
  {
    id: 'aesthetic-creamy-white',
    name: 'Creamy White',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-creamy-white',
    effectType: 'color-grade',
    parameters: { brightness: 0.1, contrast: 0.93, creamTint: 0.18, saturation: 0.95 },
    performanceTier: 'light',
    enabled: true,
    description: 'Warm milk-white highlights with creamy softened shadows.'
  },
  {
    id: 'aesthetic-moody-brown',
    name: 'Moody Brown',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-moody-brown',
    effectType: 'color-grade',
    parameters: { brownShadows: 0.32, contrast: 1.1, saturation: 0.88, warmth: 0.12 },
    performanceTier: 'light',
    enabled: true,
    description: 'Espresso and dark cedar shadows with autumn vibes.'
  },
  {
    id: 'aesthetic-dusty-rose',
    name: 'Dusty Rose',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-dusty-rose',
    effectType: 'color-grade',
    parameters: { dustyRose: 0.26, contrast: 0.95, saturation: 0.92, warmth: 0.04 },
    performanceTier: 'light',
    enabled: true,
    description: 'Desaturated antique rosewood and dried petals tone.'
  },
  {
    id: 'aesthetic-ocean-blue',
    name: 'Ocean Blue',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-ocean-blue',
    effectType: 'color-grade',
    parameters: { oceanTint: 0.25, saturation: 1.12, contrast: 1.06, shadowLift: 0.05 },
    performanceTier: 'light',
    enabled: true,
    description: 'Mediterranean cobalt and aquamarine sea grading.'
  },
  {
    id: 'aesthetic-soft-green',
    name: 'Soft Green',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-soft-green',
    effectType: 'color-grade',
    parameters: { sageTint: 0.22, saturation: 0.94, contrast: 0.96, brightness: 0.04 },
    performanceTier: 'light',
    enabled: true,
    description: 'Earthy sage and eucalyptus greenery with bright highlights.'
  },
  {
    id: 'aesthetic-peach-haze',
    name: 'Peach Haze',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-peach-haze',
    effectType: 'color-grade',
    parameters: { peachTint: 0.24, warmth: 0.14, bloom: 0.25, contrast: 0.92 },
    performanceTier: 'light',
    enabled: true,
    description: 'Luminous apricot and peach atmospheric diffusion.'
  },
  {
    id: 'aesthetic-minimal-white',
    name: 'Minimal White',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-minimal-white',
    effectType: 'color-grade',
    parameters: { brightness: 0.14, contrast: 1.08, saturation: 0.9, cleanWhites: 0.3 },
    performanceTier: 'light',
    enabled: true,
    description: 'Ultra-clean Scandinavian high-key interior aesthetic.'
  },
  {
    id: 'aesthetic-film-beige',
    name: 'Film Beige',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-film-beige',
    effectType: 'color-grade',
    parameters: { beigeShift: 0.22, grain: 0.15, contrast: 0.98, warmth: 0.06 },
    performanceTier: 'light',
    enabled: true,
    description: '35mm magazine print with warm paper tone base.'
  },
  {
    id: 'aesthetic-faded-colors',
    name: 'Faded Colors',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-faded-colors',
    effectType: 'color-grade',
    parameters: { blackLevel: 0.15, contrast: 0.85, saturation: 0.82, filmFade: 0.35 },
    performanceTier: 'light',
    enabled: true,
    description: 'Sun-faded printed photograph with compressed range.'
  },
  {
    id: 'aesthetic-soft-contrast',
    name: 'Soft Contrast',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-soft-contrast',
    effectType: 'color-grade',
    parameters: { contrast: 0.86, brightness: 0.06, saturation: 1.02, curveSoft: 0.3 },
    performanceTier: 'light',
    enabled: true,
    description: 'Delicate low-contrast curve maintaining rich color vibrancy.'
  },
  {
    id: 'aesthetic-dreamy-pastel',
    name: 'Dreamy Pastel',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-dreamy-pastel',
    effectType: 'color-grade',
    parameters: { bloom: 0.35, pastelShift: 0.25, saturation: 1.1, brightness: 0.08 },
    performanceTier: 'light',
    enabled: true,
    description: 'Powder blue and cherry blossom dreamy soft grade.'
  },
  {
    id: 'aesthetic-blush-tone',
    name: 'Blush Tone',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-blush-tone',
    effectType: 'color-grade',
    parameters: { tintPink: 0.16, warmth: 0.08, saturation: 1.06, contrast: 0.96 },
    performanceTier: 'light',
    enabled: true,
    description: 'Flattering warm blush wash with peach highlights.'
  },
  {
    id: 'aesthetic-clean-colors',
    name: 'Clean Colors',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-clean-colors',
    effectType: 'color-grade',
    parameters: { saturation: 1.18, contrast: 1.04, brightness: 0.04, colorPurify: 0.2 },
    performanceTier: 'light',
    enabled: true,
    description: 'Separated, pure color primaries with deep clarity.'
  },
  {
    id: 'aesthetic-night',
    name: 'Night Aesthetic',
    category: 'aesthetic',
    thumbnail: 'filter:aesthetic-night',
    effectType: 'color-grade',
    parameters: { contrast: 1.16, saturation: 1.15, coolness: 0.18, neonBoost: 0.35, vignette: 0.35 },
    performanceTier: 'light',
    enabled: true,
    description: 'Deep midnight blue tones with punchy neon highlights.'
  },

  // =========================================================================
  // CATEGORY 3: CINEMATIC & FILM (20 Filters)
  // =========================================================================
  {
    id: 'cine-cinema',
    name: 'Cinema',
    category: 'cinematic',
    thumbnail: 'filter:cine-cinema',
    effectType: 'color-grade',
    parameters: { contrast: 1.12, saturation: 0.95, anamorphicTint: 0.15, letterbox: true, vignette: 0.25 },
    performanceTier: 'light',
    enabled: true,
    description: 'Anamorphic widescreen cinema letterbox and Hollywood grading.'
  },
  {
    id: 'cine-film-grain',
    name: 'Film Grain',
    category: 'cinematic',
    thumbnail: 'filter:cine-film-grain',
    effectType: 'color-grade',
    parameters: { grain: 0.45, contrast: 1.06, saturation: 0.94, blackLevel: 0.08 },
    performanceTier: 'light',
    enabled: true,
    description: 'Authentic 35mm silver-halide film grain simulation.'
  },
  {
    id: 'cine-teal-orange',
    name: 'Teal & Orange',
    category: 'cinematic',
    thumbnail: 'filter:cine-teal-orange',
    effectType: 'color-grade',
    parameters: { tealOrange: 0.5, contrast: 1.14, saturation: 1.08, shadowTeal: 0.3, highlightOrange: 0.3 },
    performanceTier: 'light',
    enabled: true,
    description: 'Blockbuster color split: teal shadows and warm skin tones.'
  },
  {
    id: 'cine-movie-night',
    name: 'Movie Night',
    category: 'cinematic',
    thumbnail: 'filter:cine-movie-night',
    effectType: 'color-grade',
    parameters: { contrast: 1.18, brightness: -0.06, warmth: 0.08, vignette: 0.4 },
    performanceTier: 'light',
    enabled: true,
    description: 'Low-key cinema lighting with rich dark theater atmosphere.'
  },
  {
    id: 'cine-dramatic-contrast',
    name: 'Dramatic Contrast',
    category: 'cinematic',
    thumbnail: 'filter:cine-dramatic-contrast',
    effectType: 'color-grade',
    parameters: { contrast: 1.35, saturation: 0.9, shadowCrush: 0.2, vignette: 0.3 },
    performanceTier: 'light',
    enabled: true,
    description: 'Chiaroscuro lighting with dramatic deep blacks.'
  },
  {
    id: 'cine-film-noir',
    name: 'Film Noir',
    category: 'cinematic',
    thumbnail: 'filter:cine-film-noir',
    effectType: 'color-grade',
    parameters: { grayscale: 1.0, contrast: 1.45, grain: 0.35, vignette: 0.5 },
    performanceTier: 'light',
    enabled: true,
    description: 'Classic 1940s hard monochrome detective movie grade.'
  },
  {
    id: 'cine-warmth',
    name: 'Cinematic Warmth',
    category: 'cinematic',
    thumbnail: 'filter:cine-warmth',
    effectType: 'color-grade',
    parameters: { warmth: 0.25, contrast: 1.08, goldenFilm: 0.2, grain: 0.15 },
    performanceTier: 'light',
    enabled: true,
    description: 'Warm tungsten cinematic film stock with organic texture.'
  },
  {
    id: 'cine-cool',
    name: 'Cinematic Cool',
    category: 'cinematic',
    thumbnail: 'filter:cine-cool',
    effectType: 'color-grade',
    parameters: { coolness: 0.28, contrast: 1.1, steelBlue: 0.22, vignette: 0.2 },
    performanceTier: 'light',
    enabled: true,
    description: 'High-tension thriller steel blue palette.'
  },
  {
    id: 'cine-silver-screen',
    name: 'Silver Screen',
    category: 'cinematic',
    thumbnail: 'filter:cine-silver-screen',
    effectType: 'color-grade',
    parameters: { grayscale: 0.85, contrast: 1.2, bloom: 0.3, silverTone: 0.25 },
    performanceTier: 'light',
    enabled: true,
    description: 'Golden-era Hollywood luminous silver diffusion glow.'
  },
  {
    id: 'cine-dark-cinema',
    name: 'Dark Cinema',
    category: 'cinematic',
    thumbnail: 'filter:cine-dark-cinema',
    effectType: 'color-grade',
    parameters: { brightness: -0.1, contrast: 1.22, saturation: 0.85, vignette: 0.45 },
    performanceTier: 'light',
    enabled: true,
    description: 'Moody underexposed cinematography with focused lighting.'
  },
  {
    id: 'cine-golden-cinema',
    name: 'Golden Cinema',
    category: 'cinematic',
    thumbnail: 'filter:cine-golden-cinema',
    effectType: 'color-grade',
    parameters: { warmth: 0.22, saturation: 1.1, contrast: 1.05, amberGlow: 0.18 },
    performanceTier: 'light',
    enabled: true,
    description: 'Warm European summer film color grading.'
  },
  {
    id: 'cine-desaturated-film',
    name: 'Desaturated Film',
    category: 'cinematic',
    thumbnail: 'filter:cine-desaturated-film',
    effectType: 'color-grade',
    parameters: { saturation: 0.55, contrast: 1.25, grain: 0.28, bleachBypass: 0.4 },
    performanceTier: 'light',
    enabled: true,
    description: 'Bleach-bypass war movie look with intense grit.'
  },
  {
    id: 'cine-vintage-cinema',
    name: 'Vintage Cinema',
    category: 'cinematic',
    thumbnail: 'filter:cine-vintage-cinema',
    effectType: 'color-grade',
    parameters: { technicolor: 0.35, contrast: 1.08, saturation: 1.15, grain: 0.2 },
    performanceTier: 'light',
    enabled: true,
    description: 'Classic 3-strip Technicolor vibrant vintage cinema.'
  },
  {
    id: 'cine-blue-hour',
    name: 'Blue Hour',
    category: 'cinematic',
    thumbnail: 'filter:cine-blue-hour',
    effectType: 'color-grade',
    parameters: { coolness: 0.35, violetTint: 0.15, contrast: 1.06, duskGradient: 0.3 },
    performanceTier: 'light',
    enabled: true,
    description: 'Atmospheric twilight hour deep blue sky cast.'
  },
  {
    id: 'cine-urban-film',
    name: 'Urban Film',
    category: 'cinematic',
    thumbnail: 'filter:cine-urban-film',
    effectType: 'color-grade',
    parameters: { sodiumYellow: 0.2, cyanShadows: 0.18, contrast: 1.15, grain: 0.22 },
    performanceTier: 'light',
    enabled: true,
    description: 'Gritty metropolitan street tones under sodium city lights.'
  },
  {
    id: 'cine-documentary',
    name: 'Documentary',
    category: 'cinematic',
    thumbnail: 'filter:cine-documentary',
    effectType: 'color-grade',
    parameters: { contrast: 0.94, saturation: 0.95, neutralCurve: 0.25, sharpness: 0.15 },
    performanceTier: 'light',
    enabled: true,
    description: 'Real-life neutral flat profile for documentary realism.'
  },
  {
    id: 'cine-analog-movie',
    name: 'Analog Movie',
    category: 'cinematic',
    thumbnail: 'filter:cine-analog-movie',
    effectType: 'color-grade',
    parameters: { grain: 0.4, gateWeave: 0.1, warmth: 0.12, vignette: 0.3 },
    performanceTier: 'light',
    enabled: true,
    description: '16mm hand-cranked celluloid character and gate softness.'
  },
  {
    id: 'cine-soft-cinema',
    name: 'Soft Cinema',
    category: 'cinematic',
    thumbnail: 'filter:cine-soft-cinema',
    effectType: 'color-grade',
    parameters: { bloom: 0.4, contrast: 0.94, blackLevel: 0.08, proMist: 0.35 },
    performanceTier: 'light',
    enabled: true,
    description: 'Hollywood Black Pro-Mist lens diffusion flare.'
  },
  {
    id: 'cine-night-film',
    name: 'Night Film',
    category: 'cinematic',
    thumbnail: 'filter:cine-night-film',
    effectType: 'color-grade',
    parameters: { highISO: 0.35, coolness: 0.15, neonGreen: 0.12, contrast: 1.1 },
    performanceTier: 'light',
    enabled: true,
    description: 'High-sensitivity nighttime motion picture film look.'
  },
  {
    id: 'cine-cinema-fade',
    name: 'Cinema Fade',
    category: 'cinematic',
    thumbnail: 'filter:cine-cinema-fade',
    effectType: 'color-grade',
    parameters: { blackLevel: 0.18, contrast: 0.92, saturation: 0.92, splitTone: 0.2 },
    performanceTier: 'light',
    enabled: true,
    description: 'Milky lifted blacks with delicate cyan-amber split.'
  },

  // =========================================================================
  // CATEGORY 4: RETRO & VINTAGE (20 Filters)
  // =========================================================================
  {
    id: 'retro-90s',
    name: '90s Retro',
    category: 'retro',
    thumbnail: 'filter:retro-90s',
    effectType: 'color-grade',
    parameters: { flashGlow: 0.25, saturation: 1.25, contrast: 1.12, grain: 0.2 },
    performanceTier: 'light',
    enabled: true,
    description: '1990s disposable flash photo with vibrant color saturation.'
  },
  {
    id: 'retro-vhs',
    name: 'VHS',
    category: 'retro',
    thumbnail: 'filter:retro-vhs',
    effectType: 'distortion',
    parameters: { scanlines: 0.35, chromaticAberration: 0.25, vhsNoise: 0.3 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Authentic VHS tape scanlines and analog tracking noise.'
  },
  {
    id: 'retro-polaroid',
    name: 'Polaroid',
    category: 'retro',
    thumbnail: 'filter:retro-polaroid',
    effectType: 'color-grade',
    parameters: { instantTone: 0.35, cyanShadows: 0.15, blackLevel: 0.12, warmth: 0.08 },
    performanceTier: 'light',
    enabled: true,
    description: 'Instant film chemicals with cyan cast in deep shadows.'
  },
  {
    id: 'retro-y2k',
    name: 'Y2K',
    category: 'retro',
    thumbnail: 'filter:retro-y2k',
    effectType: 'color-grade',
    parameters: { metallicGlow: 0.3, magentaShift: 0.2, brightness: 0.1, contrast: 1.15 },
    performanceTier: 'light',
    enabled: true,
    description: 'Futuristic year-2000 metallic chrome and hot magenta sheen.'
  },
  {
    id: 'retro-analog',
    name: 'Analog',
    category: 'retro',
    thumbnail: 'filter:retro-analog',
    effectType: 'color-grade',
    parameters: { grain: 0.3, warmth: 0.15, chromaticShift: 0.12, vignette: 0.25 },
    performanceTier: 'light',
    enabled: true,
    description: 'Organic analog camera warmth and slight edge color fringe.'
  },
  {
    id: 'retro-old-camera',
    name: 'Old Camera',
    category: 'retro',
    thumbnail: 'filter:retro-old-camera',
    effectType: 'color-grade',
    parameters: { radialVignette: 0.5, edgeSoftness: 0.4, warmth: 0.18, sepia: 0.2 },
    performanceTier: 'light',
    enabled: true,
    description: 'Bellows box camera edge distortion and heavy vignette.'
  },
  {
    id: 'retro-sepia-memories',
    name: 'Sepia Memories',
    category: 'retro',
    thumbnail: 'filter:retro-sepia-memories',
    effectType: 'color-grade',
    parameters: { sepia: 0.85, contrast: 1.15, grain: 0.3, vignette: 0.35 },
    performanceTier: 'light',
    enabled: true,
    description: 'Warm darkroom sepia toning from vintage historical prints.'
  },
  {
    id: 'retro-flash',
    name: 'Retro Flash',
    category: 'retro',
    thumbnail: 'filter:retro-flash',
    effectType: 'color-grade',
    parameters: { centerFlash: 0.4, contrast: 1.25, saturation: 1.15, edgeFalloff: 0.45 },
    performanceTier: 'light',
    enabled: true,
    description: 'Harsh direct on-camera party flash with falloff.'
  },
  {
    id: 'retro-vintage-brown',
    name: 'Vintage Brown',
    category: 'retro',
    thumbnail: 'filter:retro-vintage-brown',
    effectType: 'color-grade',
    parameters: { brownTone: 0.4, saturation: 0.85, contrast: 1.05, grain: 0.25 },
    performanceTier: 'light',
    enabled: true,
    description: '1970s yellow-brown family album photograph.'
  },
  {
    id: 'retro-faded-memories',
    name: 'Faded Memories',
    category: 'retro',
    thumbnail: 'filter:retro-faded-memories',
    effectType: 'color-grade',
    parameters: { blackLevel: 0.22, saturation: 0.75, warmth: 0.1, dustArtifacts: 0.15 },
    performanceTier: 'light',
    enabled: true,
    description: 'Sun-bleached scrapbook memory with faded inks.'
  },
  {
    id: 'retro-pink',
    name: 'Retro Pink',
    category: 'retro',
    thumbnail: 'filter:retro-pink',
    effectType: 'color-grade',
    parameters: { tintPink: 0.28, warmth: 0.05, grain: 0.2, contrast: 0.95 },
    performanceTier: 'light',
    enabled: true,
    description: 'Cross-processed magenta chemical bath film tone.'
  },
  {
    id: 'retro-blue',
    name: 'Retro Blue',
    category: 'retro',
    thumbnail: 'filter:retro-blue',
    effectType: 'color-grade',
    parameters: { cyanotype: 0.45, coolness: 0.3, contrast: 1.1, grain: 0.2 },
    performanceTier: 'light',
    enabled: true,
    description: '19th century cyanotype blue photographic chemistry.'
  },
  {
    id: 'retro-warm-70s',
    name: 'Warm 70s',
    category: 'retro',
    thumbnail: 'filter:retro-warm-70s',
    effectType: 'color-grade',
    parameters: { warmth: 0.35, goldenYellow: 0.25, contrast: 1.08, saturation: 1.1 },
    performanceTier: 'light',
    enabled: true,
    description: 'Kodachrome 64 golden yellow-orange warmth.'
  },
  {
    id: 'retro-classic-film',
    name: 'Classic Film',
    category: 'retro',
    thumbnail: 'filter:retro-classic-film',
    effectType: 'color-grade',
    parameters: { fujiGreen: 0.2, contrast: 1.06, grain: 0.25, saturation: 1.02 },
    performanceTier: 'light',
    enabled: true,
    description: 'Fuji Superia 400 film look with emerald green shadows.'
  },
  {
    id: 'retro-disposable',
    name: 'Disposable Camera',
    category: 'retro',
    thumbnail: 'filter:retro-disposable',
    effectType: 'color-grade',
    parameters: { plasticLensFlare: 0.25, contrast: 1.2, saturation: 1.18, grain: 0.3 },
    performanceTier: 'light',
    enabled: true,
    description: 'Drugstore disposable camera plastic lens imperfections.'
  },
  {
    id: 'retro-dusty-film',
    name: 'Dusty Film',
    category: 'retro',
    thumbnail: 'filter:retro-dusty-film',
    effectType: 'particle',
    parameters: { dustScratches: 0.5, grain: 0.35, sepia: 0.15 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Physical dust specks, fibers, and celluloid scratches.'
  },
  {
    id: 'retro-old-newspaper',
    name: 'Old Newspaper',
    category: 'retro',
    thumbnail: 'filter:retro-old-newspaper',
    effectType: 'distortion',
    parameters: { halftoneDots: 0.45, yellowedPaper: 0.3, contrast: 1.3 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Vintage newsprint halftone dots and aged yellow paper.'
  },
  {
    id: 'retro-green',
    name: 'Retro Green',
    category: 'retro',
    thumbnail: 'filter:retro-green',
    effectType: 'color-grade',
    parameters: { phosphorGreen: 0.45, contrast: 1.25, scanlines: 0.2 },
    performanceTier: 'light',
    enabled: true,
    description: 'Old CRT terminal phosphor green monochrome.'
  },
  {
    id: 'retro-nostalgia',
    name: 'Nostalgia',
    category: 'retro',
    thumbnail: 'filter:retro-nostalgia',
    effectType: 'color-grade',
    parameters: { warmth: 0.18, bloom: 0.3, vignette: 0.3, softContrast: 0.9 },
    performanceTier: 'light',
    enabled: true,
    description: 'Soft childhood memory glow with warm ambient vignette.'
  },
  {
    id: 'retro-vintage-fade',
    name: 'Vintage Fade',
    category: 'retro',
    thumbnail: 'filter:retro-vintage-fade',
    effectType: 'color-grade',
    parameters: { blackLevel: 0.25, saturation: 0.8, warmth: 0.12, contrast: 0.88 },
    performanceTier: 'light',
    enabled: true,
    description: 'Aged 1960s postcard print with matte lifted shadows.'
  },

  // =========================================================================
  // CATEGORY 5: FACE EFFECTS (20 Filters)
  // =========================================================================
  {
    id: 'face-rosy-blush',
    name: 'Rosy Blush',
    category: 'face',
    thumbnail: 'filter:face-rosy-blush',
    effectType: 'face-landmark',
    parameters: { blushColor: '#ff5c8a', blushOpacity: 0.48, blushRadius: 0.18 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Airbrushed natural rose blush centered on cheek apples.'
  },
  {
    id: 'face-freckles',
    name: 'Freckles',
    category: 'face',
    thumbnail: 'filter:face-freckles',
    effectType: 'face-landmark',
    parameters: { freckleCount: 38, freckleColor: '#8a5231', freckleOpacity: 0.65 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Sun-kissed organic freckles across the bridge and cheeks.'
  },
  {
    id: 'face-glitter-makeup',
    name: 'Glitter Makeup',
    category: 'face',
    thumbnail: 'filter:face-glitter-makeup',
    effectType: 'face-landmark',
    parameters: { sparkleColor: '#ffd700', density: 30, shimmerSpeed: 1.5 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Shimmering metallic glitter dusting cheekbones and temples.'
  },
  {
    id: 'face-star-makeup',
    name: 'Star Makeup',
    category: 'face',
    thumbnail: 'filter:face-star-makeup',
    effectType: 'face-landmark',
    parameters: { starColor: '#f7d070', countPerCheek: 4, starSize: 14 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Golden mini-stars stamped gracefully beneath the eyes.'
  },
  {
    id: 'face-heart-makeup',
    name: 'Heart Makeup',
    category: 'face',
    thumbnail: 'filter:face-heart-makeup',
    effectType: 'face-landmark',
    parameters: { heartColor: '#ff4d6d', heartSize: 16, cheekOffset: 0.08 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Cute red and pink heart stamps on cheekbones.'
  },
  {
    id: 'face-butterfly-makeup',
    name: 'Butterfly Makeup',
    category: 'face',
    thumbnail: 'filter:face-butterfly-makeup',
    effectType: 'face-landmark',
    parameters: { wingColor: '#a78bfa', wingSpan: 0.35, sparkleCenter: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Delicate butterfly wings spread across nose bridge and eyes.'
  },
  {
    id: 'face-rainbow-paint',
    name: 'Rainbow Paint',
    category: 'face',
    thumbnail: 'filter:face-rainbow-paint',
    effectType: 'face-landmark',
    parameters: { stripeHeight: 8, opacity: 0.75, cheekSide: 'both' },
    performanceTier: 'medium',
    enabled: true,
    description: 'Vibrant celebratory rainbow brush stroke across cheeks.'
  },
  {
    id: 'face-neon-paint',
    name: 'Neon Face Paint',
    category: 'face',
    thumbnail: 'filter:face-neon-paint',
    effectType: 'face-landmark',
    parameters: { neonColor: '#00f5d4', glowSize: 12, pattern: 'cyber-tribal' },
    performanceTier: 'medium',
    enabled: true,
    description: 'Cyberpunk neon tribal markings glowing in the dark.'
  },
  {
    id: 'face-golden-sparkles',
    name: 'Golden Sparkles',
    category: 'face',
    thumbnail: 'filter:face-golden-sparkles',
    effectType: 'face-landmark',
    parameters: { goldColor: '#e5a93b', sparkleRate: 20, faceTracker: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Floating 24k gold glitter particles surrounding the face.'
  },
  {
    id: 'face-silver-sparkles',
    name: 'Silver Sparkles',
    category: 'face',
    thumbnail: 'filter:face-silver-sparkles',
    effectType: 'face-landmark',
    parameters: { silverColor: '#e2e8f0', sparkleRate: 22, diamondGlint: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Diamond silver shimmer highlighting cheek and eye contours.'
  },
  {
    id: 'face-floral-makeup',
    name: 'Floral Makeup',
    category: 'face',
    thumbnail: 'filter:face-floral-makeup',
    effectType: 'face-landmark',
    parameters: { petalColor: '#fbcfe8', flowerRadius: 10, count: 6 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Dainty blooming blossoms painted along temple contours.'
  },
  {
    id: 'face-cosmic-makeup',
    name: 'Cosmic Makeup',
    category: 'face',
    thumbnail: 'filter:face-cosmic-makeup',
    effectType: 'face-landmark',
    parameters: { nebulaGradient: true, stardustCount: 25, eyeShadowGlow: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Deep galaxy purple and cyan nebula eyeshadow with stardust.'
  },
  {
    id: 'face-festival-glitter',
    name: 'Festival Glitter',
    category: 'face',
    thumbnail: 'filter:face-festival-glitter',
    effectType: 'face-landmark',
    parameters: { chunkyGlitter: true, colors: ['#ec4899', '#8b5cf6', '#06b6d4'], size: 8 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Chunky festival glitter clusters swept beneath eyes.'
  },
  {
    id: 'face-cute-blush',
    name: 'Cute Blush',
    category: 'face',
    thumbnail: 'filter:face-cute-blush',
    effectType: 'face-landmark',
    parameters: { kawaiiLines: true, blushColor: '#fb7185', opacity: 0.6 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Anime kawaii blush with diagonal cuteness lines.'
  },
  {
    id: 'face-dramatic-eyeliner',
    name: 'Dramatic Eyeliner',
    category: 'face',
    thumbnail: 'filter:face-dramatic-eyeliner',
    effectType: 'face-landmark',
    parameters: { wingAngle: 32, wingLength: 18, color: '#09090b', thickness: 3 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Sharp, dramatic cat-wing eyeliner tracking eyelid landmarks.'
  },
  {
    id: 'face-fantasy-eyes',
    name: 'Fantasy Eyes',
    category: 'face',
    thumbnail: 'filter:face-fantasy-eyes',
    effectType: 'face-landmark',
    parameters: { irisGlow: '#38bdf8', ringIntensity: 0.6, pupilSparkle: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Luminous fantasy eye radiance with glowing iris enhancement.'
  },
  {
    id: 'face-pastel-makeup',
    name: 'Pastel Makeup',
    category: 'face',
    thumbnail: 'filter:face-pastel-makeup',
    effectType: 'face-landmark',
    parameters: { shadowColors: ['#fbcfe8', '#ddd6fe', '#c7d2fe'], blendSoft: 0.8 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Soft pastel gradient eyeshadow and pale peach lips.'
  },
  {
    id: 'face-electric-makeup',
    name: 'Electric Makeup',
    category: 'face',
    thumbnail: 'filter:face-electric-makeup',
    effectType: 'face-landmark',
    parameters: { lightningBolts: true, glowColor: '#00f5ff', boltColor: '#ffffff' },
    performanceTier: 'medium',
    enabled: true,
    description: 'Stylized Bowie-inspired lightning bolt cheek accents.'
  },
  {
    id: 'face-aurora-makeup',
    name: 'Aurora Makeup',
    category: 'face',
    thumbnail: 'filter:face-aurora-makeup',
    effectType: 'face-landmark',
    parameters: { iridescentShift: true, greenVioletBlend: 0.6 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Northern lights shifting green and violet highlights across skin.'
  },
  {
    id: 'face-crystal-makeup',
    name: 'Crystal Makeup',
    category: 'face',
    thumbnail: 'filter:face-crystal-makeup',
    effectType: 'face-landmark',
    parameters: { jewelCount: 10, jewelRefraction: true, browPlacement: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Rhinestone crystal jewels embedded along brow bone.'
  },

  // =========================================================================
  // CATEGORY 6: GLASSES & ACCESSORIES (20 Filters)
  // =========================================================================
  {
    id: 'acc-classic-sunglasses',
    name: 'Classic Sunglasses',
    category: 'accessories',
    thumbnail: 'filter:acc-classic-sunglasses',
    effectType: 'face-landmark',
    parameters: { style: 'wayfarer', frameColor: '#111827', lensColor: '#1f2937', reflection: 0.4 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Iconic black Wayfarer shades with realistic light reflections.'
  },
  {
    id: 'acc-round-glasses',
    name: 'Round Glasses',
    category: 'accessories',
    thumbnail: 'filter:acc-round-glasses',
    effectType: 'face-landmark',
    parameters: { style: 'round-wire', frameColor: '#d4af37', lensOpacity: 0.15 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Vintage gold wire-rim circular spectacles.'
  },
  {
    id: 'acc-heart-glasses',
    name: 'Heart Glasses',
    category: 'accessories',
    thumbnail: 'filter:acc-heart-glasses',
    effectType: 'face-landmark',
    parameters: { style: 'heart', frameColor: '#e11d48', lensColor: '#fb7185', lensOpacity: 0.45 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Charming translucent candy-red heart-shaped sunglasses.'
  },
  {
    id: 'acc-cyber-glasses',
    name: 'Cyber Glasses',
    category: 'accessories',
    thumbnail: 'filter:acc-cyber-glasses',
    effectType: 'face-landmark',
    parameters: { style: 'cyber-hex', neonColor: '#00f5d4', glowRadius: 16 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Futuristic geometric neon glasses with HUD graphics.'
  },
  {
    id: 'acc-neon-glasses',
    name: 'Neon Glasses',
    category: 'accessories',
    thumbnail: 'filter:acc-neon-glasses',
    effectType: 'face-landmark',
    parameters: { style: 'neon-shutter', glowColor: '#ec4899', slatted: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Electrifying 1980s neon shutter shades with vibrant glow.'
  },
  {
    id: 'acc-star-glasses',
    name: 'Star Glasses',
    category: 'accessories',
    thumbnail: 'filter:acc-star-glasses',
    effectType: 'face-landmark',
    parameters: { style: 'star', frameColor: '#fbbf24', lensColor: '#f59e0b' },
    performanceTier: 'medium',
    enabled: true,
    description: 'Glam-rock oversized star-shaped golden glasses.'
  },
  {
    id: 'acc-pixel-glasses',
    name: 'Pixel Glasses',
    category: 'accessories',
    thumbnail: 'filter:acc-pixel-glasses',
    effectType: 'face-landmark',
    parameters: { style: 'thug-life-pixel', pixelSize: 6, dropAnimation: false },
    performanceTier: 'medium',
    enabled: true,
    description: 'Classic 8-bit black pixelated "Deal With It" shades.'
  },
  {
    id: 'acc-cat-eye',
    name: 'Cat-Eye Glasses',
    category: 'accessories',
    thumbnail: 'filter:acc-cat-eye',
    effectType: 'face-landmark',
    parameters: { style: 'cat-eye', frameColor: '#881337', tortoiseShell: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Upswept 1950s tortoiseshell cat-eye fashion frames.'
  },
  {
    id: 'acc-aviator',
    name: 'Aviator Glasses',
    category: 'accessories',
    thumbnail: 'filter:acc-aviator',
    effectType: 'face-landmark',
    parameters: { style: 'aviator', frameColor: '#eab308', mirrorGradient: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Classic gold-rim teardrop pilot aviators with mirrored lenses.'
  },
  {
    id: 'acc-futuristic-visor',
    name: 'Futuristic Visor',
    category: 'accessories',
    thumbnail: 'filter:acc-futuristic-visor',
    effectType: 'face-landmark',
    parameters: { style: 'visor', visorColor: '#38bdf8', scanBeam: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Single-lens continuous cyborg cyber visor with scanning glow.'
  },
  {
    id: 'acc-golden-crown',
    name: 'Golden Crown',
    category: 'accessories',
    thumbnail: 'filter:acc-golden-crown',
    effectType: 'face-landmark',
    parameters: { style: 'royal-crown', material: 'gold', jewelColors: ['#ef4444', '#3b82f6'] },
    performanceTier: 'medium',
    enabled: true,
    description: 'Majestic jeweled golden monarch crown hovering overhead.'
  },
  {
    id: 'acc-silver-crown',
    name: 'Silver Crown',
    category: 'accessories',
    thumbnail: 'filter:acc-silver-crown',
    effectType: 'face-landmark',
    parameters: { style: 'silver-crown', material: 'silver', sapphires: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Gleaming platinum silver crown studded with bright jewels.'
  },
  {
    id: 'acc-floating-halo',
    name: 'Floating Halo',
    category: 'accessories',
    thumbnail: 'filter:acc-floating-halo',
    effectType: 'face-landmark',
    parameters: { style: 'angelic-halo', glowColor: '#fef08a', hoverFloat: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Angelic golden ring of pure light floating above head.'
  },
  {
    id: 'acc-flower-crown',
    name: 'Flower Crown',
    category: 'accessories',
    thumbnail: 'filter:acc-flower-crown',
    effectType: 'face-landmark',
    parameters: { style: 'floral-wreath', flowerTypes: ['rose', 'daisy', 'sunflower'] },
    performanceTier: 'medium',
    enabled: true,
    description: 'Bohemian hand-woven festival floral wreath.'
  },
  {
    id: 'acc-bunny-ears',
    name: 'Bunny Ears',
    category: 'accessories',
    thumbnail: 'filter:acc-bunny-ears',
    effectType: 'face-landmark',
    parameters: { style: 'bunny-ears', earColor: '#ffffff', innerEarColor: '#f472b6', twitch: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Fluffy white rabbit ears that dynamically track head tilt.'
  },
  {
    id: 'acc-cat-ears',
    name: 'Cat Ears',
    category: 'accessories',
    thumbnail: 'filter:acc-cat-ears',
    effectType: 'face-landmark',
    parameters: { style: 'cat-ears', earColor: '#1e293b', innerEarColor: '#fb7185', bells: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Playful kitten ears with pink satin interior and bells.'
  },
  {
    id: 'acc-bear-ears',
    name: 'Bear Ears',
    category: 'accessories',
    thumbnail: 'filter:acc-bear-ears',
    effectType: 'face-landmark',
    parameters: { style: 'teddy-ears', earColor: '#78350f', innerEarColor: '#fde68a' },
    performanceTier: 'medium',
    enabled: true,
    description: 'Round cuddly teddy bear ears tracking forehead orientation.'
  },
  {
    id: 'acc-fantasy-horns',
    name: 'Fantasy Horns',
    category: 'accessories',
    thumbnail: 'filter:acc-fantasy-horns',
    effectType: 'face-landmark',
    parameters: { style: 'demon-horns', hornColor: '#dc2626', tipGlow: '#f87171' },
    performanceTier: 'medium',
    enabled: true,
    description: 'Curved demonic fantasy horns with glowing magma tips.'
  },
  {
    id: 'acc-magical-headband',
    name: 'Magical Headband',
    category: 'accessories',
    thumbnail: 'filter:acc-magical-headband',
    effectType: 'face-landmark',
    parameters: { style: 'anime-ribbon', ribbonColor: '#ec4899', starBrooch: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Magical girl anime headband featuring large satin bow.'
  },
  {
    id: 'acc-royal-tiara',
    name: 'Royal Tiara',
    category: 'accessories',
    thumbnail: 'filter:acc-royal-tiara',
    effectType: 'face-landmark',
    parameters: { style: 'princess-tiara', diamondSparkle: true, silverArch: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Sparkling diamond princess tiara with brilliant facet glints.'
  },

  // =========================================================================
  // CATEGORY 7: FANTASY & ANIME (20 Filters)
  // =========================================================================
  {
    id: 'fantasy-anime-glow',
    name: 'Anime Glow',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-anime-glow',
    effectType: 'composite',
    parameters: { celOutline: true, rimGlow: '#a855f7', brightness: 0.12, contrast: 1.15 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Vibrant cel-shaded anime aesthetic with luminous backlighting.'
  },
  {
    id: 'fantasy-fairy-dust',
    name: 'Fairy Dust',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-fairy-dust',
    effectType: 'particle',
    parameters: { particleType: 'fairy-sparkle', colors: ['#fef08a', '#c084fc', '#67e8f9'], count: 45 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Trailing swirls of iridescent sparkling fairy dust.'
  },
  {
    id: 'fantasy-ice-queen',
    name: 'Ice Queen',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-ice-queen',
    effectType: 'composite',
    parameters: { frostBorder: 0.35, coolness: 0.3, crystalSparkles: 25, paleLips: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Frosty crystalline aura with frozen edge vignetting.'
  },
  {
    id: 'fantasy-fire-aura',
    name: 'Fire Aura',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-fire-aura',
    effectType: 'particle',
    parameters: { particleType: 'flames', heatWave: 0.12, emberCount: 40, warmth: 0.25 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Raging flame embers rising with animated heat distortion.'
  },
  {
    id: 'fantasy-cyberpunk',
    name: 'Cyberpunk',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-cyberpunk',
    effectType: 'composite',
    parameters: { neonCyan: 0.35, hotMagenta: 0.35, gridLines: 0.2, chromaticAberration: 0.2 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Night City neon cyber matrix with digital HUD elements.'
  },
  {
    id: 'fantasy-galaxy-aura',
    name: 'Galaxy Aura',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-galaxy-aura',
    effectType: 'composite',
    parameters: { spiralGalaxy: true, cosmicColors: ['#3b82f6', '#8b5cf6', '#ec4899'], rotationSpeed: 0.8 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Slow-spinning celestial spiral galaxy framing head.'
  },
  {
    id: 'fantasy-magical-girl',
    name: 'Magical Girl',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-magical-girl',
    effectType: 'composite',
    parameters: { pinkRibbons: true, starBurst: true, softGlow: 0.4 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Transformation sequence with glowing pink sparkles and ribbons.'
  },
  {
    id: 'fantasy-princess',
    name: 'Fantasy Princess',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-princess',
    effectType: 'color-grade',
    parameters: { dreamGlow: 0.45, goldGlitter: 0.2, warmth: 0.14, softness: 0.3 },
    performanceTier: 'light',
    enabled: true,
    description: 'Fairytale royal radiance with soft golden diffusion.'
  },
  {
    id: 'fantasy-moonlight-aura',
    name: 'Moonlight Aura',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-moonlight-aura',
    effectType: 'composite',
    parameters: { silverAura: 0.4, crescentMoon: true, coolness: 0.22 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Mystic lunar halo with silver crescent moon and night glow.'
  },
  {
    id: 'fantasy-electric-aura',
    name: 'Electric Aura',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-electric-aura',
    effectType: 'particle',
    parameters: { lightningArcs: 8, arcColor: '#00ffff', flashFrequency: 0.3 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Crackling blue high-voltage lightning bolts around user.'
  },
  {
    id: 'fantasy-shadow-aura',
    name: 'Shadow Aura',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-shadow-aura',
    effectType: 'composite',
    parameters: { darkMist: 0.45, purpleSmoke: 0.25, contrast: 1.25 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Swirling shadowy black and dark violet ethereal tendrils.'
  },
  {
    id: 'fantasy-crystal-aura',
    name: 'Crystal Aura',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-crystal-aura',
    effectType: 'particle',
    parameters: { floatingCrystals: true, prismColors: ['#d946ef', '#06b6d4'], count: 18 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Levitating geometric quartz and amethyst crystal shards.'
  },
  {
    id: 'fantasy-mystic-blue',
    name: 'Mystic Blue',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-mystic-blue',
    effectType: 'color-grade',
    parameters: { sapphireGlow: 0.35, magicRuneTint: 0.2, coolness: 0.28 },
    performanceTier: 'light',
    enabled: true,
    description: 'Deep arcane sapphire spell aura with ambient pulse.'
  },
  {
    id: 'fantasy-pink-energy',
    name: 'Pink Energy',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-pink-energy',
    effectType: 'composite',
    parameters: { energyPulse: 0.4, hotPink: 0.4, rippleSpeed: 1.2 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Pulsating magenta power surge radiating outward.'
  },
  {
    id: 'fantasy-purple-energy',
    name: 'Purple Energy',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-purple-energy',
    effectType: 'composite',
    parameters: { psychicAura: 0.45, violetGlow: 0.35, shockwaveFrequency: 0.2 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Psychic dark purple shockwaves radiating around the subject.'
  },
  {
    id: 'fantasy-celestial-glow',
    name: 'Celestial Glow',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-celestial-glow',
    effectType: 'composite',
    parameters: { lightPillars: true, goldenBeam: 0.3, starlightBloom: 0.35 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Divine celestial light rays pouring down from above.'
  },
  {
    id: 'fantasy-stardust',
    name: 'Stardust',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-stardust',
    effectType: 'particle',
    parameters: { particleType: 'stardust', twinkleCount: 50, colorVariance: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Soft shimmering cosmic dust swirling in three dimensions.'
  },
  {
    id: 'fantasy-dream-fairy',
    name: 'Dream Fairy',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-dream-fairy',
    effectType: 'face-landmark',
    parameters: { fairyWings: true, wingColor: '#e0e7ff', flutterSpeed: 2.0 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Translucent glowing butterfly-fairy wings fluttering behind.'
  },
  {
    id: 'fantasy-warrior',
    name: 'Fantasy Warrior',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-warrior',
    effectType: 'composite',
    parameters: { runicMarkings: true, battleSparks: 15, dramaticTone: 0.25 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Glowing ancient warrior runes and ricocheting sword sparks.'
  },
  {
    id: 'fantasy-cosmic-portal',
    name: 'Cosmic Portal',
    category: 'fantasy',
    thumbnail: 'filter:fantasy-cosmic-portal',
    effectType: 'distortion',
    parameters: { vortexWarp: 0.3, portalColors: ['#4f46e5', '#ec4899'], rotationRate: 1.0 },
    performanceTier: 'heavy',
    enabled: true,
    description: 'Hypnotic swirling interdimensional portal opening behind user.'
  },

  // =========================================================================
  // CATEGORY 8: LIGHT & GLOW (20 Filters)
  // =========================================================================
  {
    id: 'light-golden-hour',
    name: 'Golden Hour',
    category: 'light',
    thumbnail: 'filter:light-golden-hour',
    effectType: 'lighting',
    parameters: { sunburstAngle: 0.75, warmth: 0.32, flareIntensity: 0.45, goldenGaze: 0.2 },
    performanceTier: 'light',
    enabled: true,
    description: 'Low-angle sun flare with warm sunset backlighting.'
  },
  {
    id: 'light-lens-flare',
    name: 'Lens Flare',
    category: 'light',
    thumbnail: 'filter:light-lens-flare',
    effectType: 'lighting',
    parameters: { anamorphicStreak: true, flareColor: '#38bdf8', intensity: 0.5 },
    performanceTier: 'light',
    enabled: true,
    description: 'Horizontal cinematic anamorphic blue lens flare.'
  },
  {
    id: 'light-neon-glow',
    name: 'Neon Glow',
    category: 'light',
    thumbnail: 'filter:light-neon-glow',
    effectType: 'lighting',
    parameters: { neonBloom: 0.55, neonPalette: 'cyber', threshold: 0.65 },
    performanceTier: 'light',
    enabled: true,
    description: 'Intense luminous bloom on bright elements resembling neon lights.'
  },
  {
    id: 'light-dream-light',
    name: 'Dream Light',
    category: 'light',
    thumbnail: 'filter:light-dream-light',
    effectType: 'lighting',
    parameters: { exposurePulse: 0.15, bloom: 0.6, warmth: 0.08, softness: 0.4 },
    performanceTier: 'light',
    enabled: true,
    description: 'Hypnotic exposure pulsing with romantic highlight halation.'
  },
  {
    id: 'light-sunset-glow',
    name: 'Sunset Glow',
    category: 'light',
    thumbnail: 'filter:light-sunset-glow',
    effectType: 'lighting',
    parameters: { sunsetGradient: true, topOrange: '#f97316', bottomPurple: '#7c3aed', opacity: 0.35 },
    performanceTier: 'light',
    enabled: true,
    description: 'Rich dusk sky gradient blending fiery orange to purple.'
  },
  {
    id: 'light-sunrise',
    name: 'Sunrise',
    category: 'light',
    thumbnail: 'filter:light-sunrise',
    effectType: 'lighting',
    parameters: { paleGold: 0.25, morningPink: 0.18, brightness: 0.08, warmth: 0.1 },
    performanceTier: 'light',
    enabled: true,
    description: 'Fresh morning daylight with delicate pastel peach rays.'
  },
  {
    id: 'light-soft-flash',
    name: 'Soft Flash',
    category: 'light',
    thumbnail: 'filter:light-soft-flash',
    effectType: 'lighting',
    parameters: { ringFlashGaze: 0.35, brightness: 0.15, contrast: 1.1, falloff: 0.2 },
    performanceTier: 'light',
    enabled: true,
    description: 'Professional beauty dish soft flash studio illumination.'
  },
  {
    id: 'light-rainbow',
    name: 'Rainbow Light',
    category: 'light',
    thumbnail: 'filter:light-rainbow',
    effectType: 'lighting',
    parameters: { rainbowBeam: true, beamAngle: 0.6, beamOpacity: 0.4 },
    performanceTier: 'light',
    enabled: true,
    description: 'Diagonal rainbow prism beam casting spectral light across face.'
  },
  {
    id: 'light-pink-leak',
    name: 'Pink Light Leak',
    category: 'light',
    thumbnail: 'filter:light-pink-leak',
    effectType: 'lighting',
    parameters: { leakColor: '#f43f5e', leakCorner: 'top-left', intensity: 0.55 },
    performanceTier: 'light',
    enabled: true,
    description: 'Organic 35mm film camera side light leak in magenta.'
  },
  {
    id: 'light-blue-leak',
    name: 'Blue Light Leak',
    category: 'light',
    thumbnail: 'filter:light-blue-leak',
    effectType: 'lighting',
    parameters: { leakColor: '#0ea5e9', leakCorner: 'top-right', intensity: 0.5 },
    performanceTier: 'light',
    enabled: true,
    description: 'Cool cyan-blue corner film fog with atmospheric haze.'
  },
  {
    id: 'light-golden-leak',
    name: 'Golden Light Leak',
    category: 'light',
    thumbnail: 'filter:light-golden-leak',
    effectType: 'lighting',
    parameters: { leakColor: '#f59e0b', leakCorner: 'bottom-left', intensity: 0.6 },
    performanceTier: 'light',
    enabled: true,
    description: 'Amber burn mark typical of film roll beginnings.'
  },
  {
    id: 'light-prism',
    name: 'Prism',
    category: 'light',
    thumbnail: 'filter:light-prism',
    effectType: 'lighting',
    parameters: { refractionFacet: 3, chromaticOffset: 0.15, blend: 'screen' },
    performanceTier: 'medium',
    enabled: true,
    description: 'Glass prism held in front of lens with rainbow refraction.'
  },
  {
    id: 'light-aurora',
    name: 'Aurora',
    category: 'light',
    thumbnail: 'filter:light-aurora',
    effectType: 'lighting',
    parameters: { auroraWaves: true, greenCyanGlow: 0.4, waveSpeed: 0.8 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Undulating northern lights emerald and violet curtain.'
  },
  {
    id: 'light-starlight',
    name: 'Starlight',
    category: 'light',
    thumbnail: 'filter:light-starlight',
    effectType: 'lighting',
    parameters: { starFilterCross: true, crossRaySize: 18, glintThreshold: 0.78 },
    performanceTier: 'light',
    enabled: true,
    description: '4-point star cross-filter on all bright specular highlights.'
  },
  {
    id: 'light-holographic',
    name: 'Holographic Glow',
    category: 'light',
    thumbnail: 'filter:light-holographic',
    effectType: 'lighting',
    parameters: { holographicShift: true, rainbowCycleSpeed: 0.6, intensity: 0.38 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Dynamic iridescent rainbow shimmer reacting to movement.'
  },
  {
    id: 'light-rainbow-prism',
    name: 'Rainbow Prism',
    category: 'light',
    thumbnail: 'filter:light-rainbow-prism',
    effectType: 'lighting',
    parameters: { ringPrism: true, ringRadius: 0.4, dispersion: 0.3 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Circular spectral rainbow ring halo surrounding subject.'
  },
  {
    id: 'light-disco',
    name: 'Disco Lights',
    category: 'light',
    thumbnail: 'filter:light-disco',
    effectType: 'lighting',
    parameters: { rotatingSpots: true, colorCount: 6, rotationSpeed: 1.2 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Revolving disco mirror-ball color spots splashing across room.'
  },
  {
    id: 'light-soft-bloom',
    name: 'Soft Bloom',
    category: 'light',
    thumbnail: 'filter:light-soft-bloom',
    effectType: 'lighting',
    parameters: { bloomRadius: 0.45, threshold: 0.5, intensity: 0.7 },
    performanceTier: 'light',
    enabled: true,
    description: 'Smooth ethereal highlight halation giving filmic glow.'
  },
  {
    id: 'light-candlelight',
    name: 'Candlelight',
    category: 'light',
    thumbnail: 'filter:light-candlelight',
    effectType: 'lighting',
    parameters: { candleFlicker: 0.15, warmth: 0.4, ambientDarkness: 0.25 },
    performanceTier: 'light',
    enabled: true,
    description: 'Flickering organic flame warmth in a dim intimate setting.'
  },
  {
    id: 'light-moon-glow',
    name: 'Moon Glow',
    category: 'light',
    thumbnail: 'filter:light-moon-glow',
    effectType: 'lighting',
    parameters: { moonlightBeam: true, coolness: 0.35, beamIntensity: 0.4 },
    performanceTier: 'light',
    enabled: true,
    description: 'Overhead spotlight beam simulating bright lunar glow.'
  },

  // =========================================================================
  // CATEGORY 9: FUN & DISTORTION (20 Filters)
  // =========================================================================
  {
    id: 'distort-big-eyes',
    name: 'Big Eyes',
    category: 'distortion',
    thumbnail: 'filter:distort-big-eyes',
    effectType: 'distortion',
    parameters: { distortionType: 'bulge-eyes', eyeScale: 1.55, eyeRadius: 0.14 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Cute anime-style enlarged eyes tracking eye landmarks.'
  },
  {
    id: 'distort-cartoon-face',
    name: 'Cartoon Face',
    category: 'distortion',
    thumbnail: 'filter:distort-cartoon-face',
    effectType: 'distortion',
    parameters: { distortionType: 'cartoon-caricature', eyeScale: 1.3, chinPinch: 0.75 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Chubby cheeks and tiny chin cartoon caricature warp.'
  },
  {
    id: 'distort-alien',
    name: 'Alien',
    category: 'distortion',
    thumbnail: 'filter:distort-alien',
    effectType: 'distortion',
    parameters: { distortionType: 'alien-head', foreheadBulge: 1.6, chinPinch: 0.6, eyeStretch: 1.4 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Extraterrestrial oversized forehead, slanted eyes, and tapered jaw.'
  },
  {
    id: 'distort-funny-stretch',
    name: 'Funny Stretch',
    category: 'distortion',
    thumbnail: 'filter:distort-funny-stretch',
    effectType: 'distortion',
    parameters: { distortionType: 'vertical-stretch', stretchFactor: 1.6, waveFreq: 2.0 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Sinusoidal vertical funhouse mirror facial stretch.'
  },
  {
    id: 'distort-pixel-face',
    name: 'Pixel Face',
    category: 'distortion',
    thumbnail: 'filter:distort-pixel-face',
    effectType: 'distortion',
    parameters: { distortionType: 'pixelate-face', blockSize: 16, trackFace: true },
    performanceTier: 'medium',
    enabled: true,
    description: '8-bit retro gaming mosaic pixelation tracking the face.'
  },
  {
    id: 'distort-mirror-world',
    name: 'Mirror World',
    category: 'distortion',
    thumbnail: 'filter:distort-mirror-world',
    effectType: 'distortion',
    parameters: { distortionType: 'mirror-horizontal', splitAxis: 0.5 },
    performanceTier: 'light',
    enabled: true,
    description: 'Bilateral horizontal mirror symmetry down center axis.'
  },
  {
    id: 'distort-neon-outline',
    name: 'Neon Outline',
    category: 'distortion',
    thumbnail: 'filter:distort-neon-outline',
    effectType: 'distortion',
    parameters: { distortionType: 'sobel-neon', neonColor: '#00ffcc', sensitivity: 1.8 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Luminescent laser outline wireframe tracing all edges.'
  },
  {
    id: 'distort-comic-book',
    name: 'Comic Book',
    category: 'distortion',
    thumbnail: 'filter:distort-comic-book',
    effectType: 'distortion',
    parameters: { distortionType: 'comic-halftone', colorQuantize: 6, dotScale: 4.0 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Vintage comic book print with black ink contours and dots.'
  },
  {
    id: 'distort-sketch-face',
    name: 'Sketch Face',
    category: 'distortion',
    thumbnail: 'filter:distort-sketch-face',
    effectType: 'distortion',
    parameters: { distortionType: 'pencil-sketch', contrastBoost: 1.5, paperTexture: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Intricate graphite pencil crosshatch portrait sketch.'
  },
  {
    id: 'distort-pop-art',
    name: 'Pop Art',
    category: 'distortion',
    thumbnail: 'filter:distort-pop-art',
    effectType: 'distortion',
    parameters: { distortionType: 'warhol-4quad', vibrantColors: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Andy Warhol 4-quadrant silkscreen pop art with contrasting primaries.'
  },
  {
    id: 'distort-rgb-glitch',
    name: 'RGB Glitch',
    category: 'distortion',
    thumbnail: 'filter:distort-rgb-glitch',
    effectType: 'distortion',
    parameters: { distortionType: 'rgb-split', displacement: 0.04, sliceFrequency: 0.4 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Channel displacement and horizontal scanline slicing.'
  },
  {
    id: 'distort-digital-glitch',
    name: 'Digital Glitch',
    category: 'distortion',
    thumbnail: 'filter:distort-digital-glitch',
    effectType: 'distortion',
    parameters: { distortionType: 'datamosh-blocks', blockSize: 32, glitchRate: 0.35 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Datamoshed video compression artifact blocks and stutter.'
  },
  {
    id: 'distort-wave',
    name: 'Wave Distortion',
    category: 'distortion',
    thumbnail: 'filter:distort-wave',
    effectType: 'distortion',
    parameters: { distortionType: 'water-wave', waveSpeed: 2.0, amplitude: 0.025, frequency: 18.0 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Underwater swimming ripple distortion across camera.'
  },
  {
    id: 'distort-kaleidoscope',
    name: 'Kaleidoscope',
    category: 'distortion',
    thumbnail: 'filter:distort-kaleidoscope',
    effectType: 'distortion',
    parameters: { distortionType: 'kaleidoscope', segments: 8, rotationRate: 0.5 },
    performanceTier: 'medium',
    enabled: true,
    description: '8-fold rotating radial optical kaleidoscope symmetry.'
  },
  {
    id: 'distort-double-vision',
    name: 'Double Vision',
    category: 'distortion',
    thumbnail: 'filter:distort-double-vision',
    effectType: 'distortion',
    parameters: { distortionType: 'stereoscopic-ghost', offset: 0.05, opacity: 0.5 },
    performanceTier: 'light',
    enabled: true,
    description: 'Dizzying double-image echo overlay with color fringing.'
  },
  {
    id: 'distort-chromatic-shift',
    name: 'Chromatic Shift',
    category: 'distortion',
    thumbnail: 'filter:distort-chromatic-shift',
    effectType: 'distortion',
    parameters: { distortionType: 'radial-chromatic', redShift: 0.03, blueShift: -0.03 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Radial prismatic lens fringing stronger toward screen edges.'
  },
  {
    id: 'distort-poster-art',
    name: 'Poster Art',
    category: 'distortion',
    thumbnail: 'filter:distort-poster-art',
    effectType: 'distortion',
    parameters: { distortionType: 'posterize', levels: 4, saturationBoost: 1.4 },
    performanceTier: 'light',
    enabled: true,
    description: 'Bold graphic screenprint posterization in vivid tones.'
  },
  {
    id: 'distort-low-poly',
    name: 'Low-Poly Look',
    category: 'distortion',
    thumbnail: 'filter:distort-low-poly',
    effectType: 'distortion',
    parameters: { distortionType: 'hexagonal-facets', facetSize: 14 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Faceted geometric low-poly 3D video game polygonal aesthetic.'
  },
  {
    id: 'distort-dream-warp',
    name: 'Dream Warp',
    category: 'distortion',
    thumbnail: 'filter:distort-dream-warp',
    effectType: 'distortion',
    parameters: { distortionType: 'vortex-swirl', swirlAngle: 1.8, radius: 0.45 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Psychedelic vortex swirl twisting the center of view.'
  },
  {
    id: 'distort-fun-reflection',
    name: 'Fun Reflection',
    category: 'distortion',
    thumbnail: 'filter:distort-fun-reflection',
    effectType: 'distortion',
    parameters: { distortionType: 'quad-mirror', originX: 0.5, originY: 0.5 },
    performanceTier: 'light',
    enabled: true,
    description: '4-way quad kaleidoscope reflection across both axes.'
  },

  // =========================================================================
  // CATEGORY 10: NATURE & SEASONAL (20 Filters)
  // =========================================================================
  {
    id: 'nature-spring-bloom',
    name: 'Spring Bloom',
    category: 'nature',
    thumbnail: 'filter:nature-spring-bloom',
    effectType: 'particle',
    parameters: { particleType: 'blossoms', floraColors: ['#f472b6', '#34d399', '#fef08a'], count: 32 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Fresh spring green vitality with drifting floral blossoms.'
  },
  {
    id: 'nature-autumn-leaves',
    name: 'Autumn Leaves',
    category: 'nature',
    thumbnail: 'filter:nature-autumn-leaves',
    effectType: 'particle',
    parameters: { particleType: 'maple-leaves', colors: ['#ea580c', '#c2410c', '#ca8a04'], count: 28 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Golden, amber, and crimson maple leaves drifting down.'
  },
  {
    id: 'nature-snowfall',
    name: 'Snowfall',
    category: 'nature',
    thumbnail: 'filter:nature-snowfall',
    effectType: 'particle',
    parameters: { particleType: 'snow', count: 65, driftSpeed: 1.0, flakeVariance: 0.8 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Gentle realistic winter snowfall with depth and organic sway.'
  },
  {
    id: 'nature-cherry-blossom',
    name: 'Cherry Blossom',
    category: 'nature',
    thumbnail: 'filter:nature-cherry-blossom',
    effectType: 'particle',
    parameters: { particleType: 'sakura', count: 35, flutterSpeed: 1.2, petalTone: '#fbcfe8' },
    performanceTier: 'medium',
    enabled: true,
    description: 'Iconic pink Japanese sakura petals swirling in the breeze.'
  },
  {
    id: 'nature-golden-leaves',
    name: 'Golden Leaves',
    category: 'nature',
    thumbnail: 'filter:nature-golden-leaves',
    effectType: 'particle',
    parameters: { particleType: 'golden-foliage', count: 30, shimmer: 0.4 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Glistening yellow-gold birch leaves tumbling softly.'
  },
  {
    id: 'nature-rainy-day',
    name: 'Rainy Day',
    category: 'nature',
    thumbnail: 'filter:nature-rainy-day',
    effectType: 'composite',
    parameters: { rainDropsOnGlass: true, rainStreakRate: 50, gloomTint: 0.15 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Atmospheric raindrops dripping down a window pane with moody gloom.'
  },
  {
    id: 'nature-summer-glow',
    name: 'Summer Glow',
    category: 'nature',
    thumbnail: 'filter:nature-summer-glow',
    effectType: 'lighting',
    parameters: { sunshineFlare: 0.35, botanicalVibrance: 0.25, warmth: 0.2 },
    performanceTier: 'light',
    enabled: true,
    description: 'Vibrant sun-drenched summer foliage and warm illumination.'
  },
  {
    id: 'nature-winter-frost',
    name: 'Winter Frost',
    category: 'nature',
    thumbnail: 'filter:nature-winter-frost',
    effectType: 'composite',
    parameters: { iceCrystalsEdge: 0.4, coolness: 0.3, frostShimmer: 0.2 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Crystalline ice patterns creeping inward from frame edges.'
  },
  {
    id: 'nature-tropical-green',
    name: 'Tropical Green',
    category: 'nature',
    thumbnail: 'filter:nature-tropical-green',
    effectType: 'color-grade',
    parameters: { jungleGreen: 0.35, saturation: 1.22, contrast: 1.08, warmth: 0.05 },
    performanceTier: 'light',
    enabled: true,
    description: 'Lush Amazon rainforest deep green saturation and warmth.'
  },
  {
    id: 'nature-ocean-breeze',
    name: 'Ocean Breeze',
    category: 'nature',
    thumbnail: 'filter:nature-ocean-breeze',
    effectType: 'composite',
    parameters: { seaSprayMist: 0.25, turquoiseTint: 0.22, freshness: 0.15 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Refreshing aquamarine sea-spray mist with coastal light.'
  },
  {
    id: 'nature-flower-garden',
    name: 'Flower Garden',
    category: 'nature',
    thumbnail: 'filter:nature-flower-garden',
    effectType: 'particle',
    parameters: { floralBorder: true, floatingPollen: 25, vibrantGarden: 0.2 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Vibrant blooming floral corner accents with floating pollen.'
  },
  {
    id: 'nature-falling-petals',
    name: 'Falling Petals',
    category: 'nature',
    thumbnail: 'filter:nature-falling-petals',
    effectType: 'particle',
    parameters: { particleType: 'rose-petals', petalColor: '#be123c', count: 26 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Velvety deep crimson rose petals floating gently.'
  },
  {
    id: 'nature-butterfly-garden',
    name: 'Butterfly Garden',
    category: 'nature',
    thumbnail: 'filter:nature-butterfly-garden',
    effectType: 'particle',
    parameters: { particleType: 'butterflies', butterflyCount: 8, flapSpeed: 2.2 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Animated colorful butterflies fluttering dynamically across screen.'
  },
  {
    id: 'nature-fireflies',
    name: 'Fireflies',
    category: 'nature',
    thumbnail: 'filter:nature-fireflies',
    effectType: 'particle',
    parameters: { particleType: 'fireflies', glowColor: '#a3e635', count: 35, pulseRate: 1.4 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Enchanting glowing green fireflies blinking in summer twilight.'
  },
  {
    id: 'nature-starry-sky',
    name: 'Starry Sky',
    category: 'nature',
    thumbnail: 'filter:nature-starry-sky',
    effectType: 'particle',
    parameters: { particleType: 'twinkle-stars', shootingStarRate: 0.15, count: 55 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Night sky backdrop speckled with twinkling stars and shooting meteors.'
  },
  {
    id: 'nature-cloud-dream',
    name: 'Cloud Dream',
    category: 'nature',
    thumbnail: 'filter:nature-cloud-dream',
    effectType: 'composite',
    parameters: { driftingClouds: true, cloudDensity: 0.35, softSunlight: 0.15 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Puffy white cumulus clouds drifting lazily across serene skies.'
  },
  {
    id: 'nature-forest-mist',
    name: 'Forest Mist',
    category: 'nature',
    thumbnail: 'filter:nature-forest-mist',
    effectType: 'composite',
    parameters: { fogRoll: 0.4, pineTone: 0.18, softHaze: 0.3 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Atmospheric Pacific Northwest morning fog rolling through evergreen pines.'
  },
  {
    id: 'nature-sunset-garden',
    name: 'Sunset Garden',
    category: 'nature',
    thumbnail: 'filter:nature-sunset-garden',
    effectType: 'lighting',
    parameters: { sunsetGlow: 0.35, floatingSpores: 20, warmth: 0.22 },
    performanceTier: 'light',
    enabled: true,
    description: 'Warm coral and lavender dusk lighting over garden greenery.'
  },
  {
    id: 'nature-winter-sparkle',
    name: 'Winter Sparkle',
    category: 'nature',
    thumbnail: 'filter:nature-winter-sparkle',
    effectType: 'particle',
    parameters: { particleType: 'ice-glitter', count: 40, diamondShine: true },
    performanceTier: 'medium',
    enabled: true,
    description: 'Glistening diamond ice dust caught in crisp winter sunbeams.'
  },
  {
    id: 'nature-dream',
    name: 'Nature Dream',
    category: 'nature',
    thumbnail: 'filter:nature-dream',
    effectType: 'composite',
    parameters: { enchantedGlow: 0.3, ambientSpores: 28, lushGreen: 0.2 },
    performanceTier: 'medium',
    enabled: true,
    description: 'Enchanted woodland atmosphere with glowing ambient flora spores.'
  }
];

// Validation function that verifies catalog integrity
export function validateFilterCatalog(filters: FilterDefinition[] = FILTERS_CATALOG): {
  isValid: boolean;
  totalCount: number;
  categoryCounts: Record<FilterCategory, number>;
  duplicates: string[];
} {
  const ids = new Set<string>();
  const duplicates: string[] = [];
  const categoryCounts: Record<FilterCategory, number> = {
    beauty: 0,
    aesthetic: 0,
    cinematic: 0,
    retro: 0,
    face: 0,
    accessories: 0,
    fantasy: 0,
    light: 0,
    distortion: 0,
    nature: 0,
  };

  for (const filter of filters) {
    if (ids.has(filter.id)) {
      duplicates.push(filter.id);
    }
    ids.add(filter.id);
    categoryCounts[filter.category] = (categoryCounts[filter.category] || 0) + 1;
  }

  const isValid =
    filters.length === 200 &&
    duplicates.length === 0 &&
    Object.values(categoryCounts).every((count) => count === 20);

  return {
    isValid,
    totalCount: filters.length,
    categoryCounts,
    duplicates,
  };
}
