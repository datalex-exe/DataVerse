/**
 * 200 Live Filter Library
 * Data-driven filter specifications across 10 distinct categories (20 per category).
 * The first item is 'Original' (no-filter base state).
 */

import { FilterDefinition, CategoryInfo } from './types';

export const FILTER_CATEGORIES: CategoryInfo[] = [
  { id: 'natural', name: 'Natural' },
  { id: 'warm', name: 'Warm' },
  { id: 'cool', name: 'Cool' },
  { id: 'bw', name: 'Black & White' },
  { id: 'vintage', name: 'Film & Vintage' },
  { id: 'aesthetic', name: 'Aesthetic' },
  { id: 'neon', name: 'Neon & Cyber' },
  { id: 'dreamy', name: 'Dreamy & Soft' },
  { id: 'cinematic', name: 'Moody & Cinematic' },
  { id: 'pastel', name: 'Pastel' },
];

export const FILTERS_CATALOG: FilterDefinition[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 1: NATURAL (20 filters) - Preserves original names
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'original',
    name: 'Original',
    category: 'natural',
    params: {},
  },
  {
    id: 'nat-beauty',
    name: 'Natural Beauty',
    category: 'natural',
    params: { brightness: 0.05, contrast: 1.05, saturation: 1.05, skinSmooth: 0.25 },
  },
  {
    id: 'soft-skin',
    name: 'Soft Skin',
    category: 'natural',
    params: { brightness: 0.08, contrast: 0.96, saturation: 1.02, skinSmooth: 0.55, bloom: 0.15 },
  },
  {
    id: 'radiance',
    name: 'Radiance',
    category: 'natural',
    params: { brightness: 0.12, contrast: 1.08, saturation: 1.1, temperature: 0.1, bloom: 0.2 },
  },
  {
    id: 'gentle-glow',
    name: 'Gentle Glow',
    category: 'natural',
    params: { brightness: 0.06, contrast: 0.98, bloom: 0.35, skinSmooth: 0.3 },
  },
  {
    id: 'fresh-face',
    name: 'Fresh Face',
    category: 'natural',
    params: { brightness: 0.09, contrast: 1.04, saturation: 1.12, tint: -0.05 },
  },
  {
    id: 'smooth-portrait',
    name: 'Smooth Portrait',
    category: 'natural',
    params: { brightness: 0.04, contrast: 1.02, skinSmooth: 0.45, vignette: 0.2 },
  },
  {
    id: 'clean-canvas',
    name: 'Clean Canvas',
    category: 'natural',
    params: { brightness: 0.05, contrast: 1.06, saturation: 1.02, sharpness: 0.2 },
  },
  {
    id: 'daylight',
    name: 'Daylight',
    category: 'natural',
    params: { brightness: 0.07, contrast: 1.05, temperature: 0.05, saturation: 1.08 },
  },
  {
    id: 'airbrush',
    name: 'Airbrush',
    category: 'natural',
    params: { brightness: 0.1, contrast: 0.96, skinSmooth: 0.6, bloom: 0.18 },
  },
  {
    id: 'pure-skin',
    name: 'Pure Skin',
    category: 'natural',
    params: { brightness: 0.06, contrast: 1.0, saturation: 1.04, skinSmooth: 0.35 },
  },
  {
    id: 'true-tone',
    name: 'True Tone',
    category: 'natural',
    params: { brightness: 0.02, contrast: 1.08, saturation: 1.06, sharpness: 0.15 },
  },
  {
    id: 'dewdrop',
    name: 'Dewdrop',
    category: 'natural',
    params: { brightness: 0.11, contrast: 1.02, bloom: 0.28, tint: 0.05 },
  },
  {
    id: 'morning-light',
    name: 'Morning Light',
    category: 'natural',
    params: { brightness: 0.08, contrast: 1.03, temperature: 0.12, bloom: 0.12 },
  },
  {
    id: 'silk-touch',
    name: 'Silk Touch',
    category: 'natural',
    params: { brightness: 0.07, contrast: 0.97, skinSmooth: 0.4, fade: 0.05 },
  },
  {
    id: 'bare-glow',
    name: 'Bare Glow',
    category: 'natural',
    params: { brightness: 0.04, contrast: 1.01, saturation: 1.03, bloom: 0.15 },
  },
  {
    id: 'velvet-soft',
    name: 'Velvet Soft',
    category: 'natural',
    params: { brightness: 0.03, contrast: 1.05, skinSmooth: 0.3, vignette: 0.25 },
  },
  {
    id: 'clear-breeze',
    name: 'Clear Breeze',
    category: 'natural',
    params: { brightness: 0.06, contrast: 1.07, temperature: -0.06, saturation: 1.06 },
  },
  {
    id: 'subtle-touch',
    name: 'Subtle Touch',
    category: 'natural',
    params: { brightness: 0.03, contrast: 1.02, saturation: 1.04, skinSmooth: 0.15 },
  },
  {
    id: 'porcelain',
    name: 'Porcelain',
    category: 'natural',
    params: { brightness: 0.1, contrast: 1.04, temperature: -0.08, tint: 0.06, skinSmooth: 0.35 },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 2: WARM (20 filters)
  // ───────────────────────────────────────────────────────────────────────────
  { id: 'warm-golden-hour', name: 'Golden Hour', category: 'warm', params: { brightness: 0.08, contrast: 1.08, temperature: 0.35, saturation: 1.15, vignette: 0.2 } },
  { id: 'warm-sunlit', name: 'Sunlit', category: 'warm', params: { brightness: 0.1, contrast: 1.05, temperature: 0.25, bloom: 0.15 } },
  { id: 'warm-honey', name: 'Honey', category: 'warm', params: { brightness: 0.05, contrast: 1.02, temperature: 0.3, tint: -0.05, saturation: 1.1 } },
  { id: 'warm-amber-glow', name: 'Amber Glow', category: 'warm', params: { brightness: 0.06, contrast: 1.1, temperature: 0.4, shadowColor: [0.15, 0.08, 0.02] } },
  { id: 'warm-tuscan-sun', name: 'Tuscan Sun', category: 'warm', params: { brightness: 0.07, contrast: 1.12, temperature: 0.3, saturation: 1.18, vignette: 0.25 } },
  { id: 'warm-hug', name: 'Warm Hug', category: 'warm', params: { brightness: 0.04, contrast: 0.98, temperature: 0.28, bloom: 0.2 } },
  { id: 'warm-sand-dune', name: 'Sand Dune', category: 'warm', params: { brightness: 0.05, contrast: 1.05, temperature: 0.22, fade: 0.08 } },
  { id: 'warm-terracotta', name: 'Terracotta', category: 'warm', params: { brightness: 0.03, contrast: 1.15, temperature: 0.32, tint: -0.08, saturation: 1.12 } },
  { id: 'warm-caramel', name: 'Caramel', category: 'warm', params: { brightness: 0.02, contrast: 1.1, temperature: 0.35, fade: 0.06 } },
  { id: 'warm-sunset-flame', name: 'Sunset Flame', category: 'warm', params: { brightness: 0.06, contrast: 1.18, temperature: 0.45, saturation: 1.25, vignette: 0.3 } },
  { id: 'warm-autumn-spice', name: 'Autumn Spice', category: 'warm', params: { brightness: 0.04, contrast: 1.12, temperature: 0.38, saturation: 1.15 } },
  { id: 'warm-desert-dusk', name: 'Desert Dusk', category: 'warm', params: { brightness: 0.02, contrast: 1.08, temperature: 0.34, tint: 0.1, vignette: 0.28 } },
  { id: 'warm-cozy-hearth', name: 'Cozy Hearth', category: 'warm', params: { brightness: -0.02, contrast: 1.2, temperature: 0.42, bloom: 0.25 } },
  { id: 'warm-cider', name: 'Warm Cider', category: 'warm', params: { brightness: 0.05, contrast: 1.06, temperature: 0.26, saturation: 1.08 } },
  { id: 'warm-goldenrod', name: 'Goldenrod', category: 'warm', params: { brightness: 0.08, contrast: 1.1, temperature: 0.32, saturation: 1.14 } },
  { id: 'warm-sunbake', name: 'Sunbake', category: 'warm', params: { brightness: 0.12, contrast: 1.15, temperature: 0.28, fade: 0.05 } },
  { id: 'warm-cinnamon', name: 'Cinnamon', category: 'warm', params: { brightness: 0.01, contrast: 1.14, temperature: 0.36, shadowColor: [0.12, 0.05, 0.0] } },
  { id: 'warm-apricot', name: 'Apricot', category: 'warm', params: { brightness: 0.09, contrast: 1.04, temperature: 0.24, tint: -0.04, bloom: 0.18 } },
  { id: 'warm-toasted', name: 'Toasted', category: 'warm', params: { brightness: 0.02, contrast: 1.16, temperature: 0.3, vignette: 0.35 } },
  { id: 'warm-solstice', name: 'Solstice', category: 'warm', params: { brightness: 0.07, contrast: 1.09, temperature: 0.33, saturation: 1.12, bloom: 0.15 } },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 3: COOL (20 filters)
  // ───────────────────────────────────────────────────────────────────────────
  { id: 'cool-nordic-blue', name: 'Nordic Blue', category: 'cool', params: { brightness: 0.04, contrast: 1.08, temperature: -0.35, saturation: 1.08 } },
  { id: 'cool-frost', name: 'Frost', category: 'cool', params: { brightness: 0.1, contrast: 1.06, temperature: -0.4, bloom: 0.2 } },
  { id: 'cool-glacier', name: 'Glacier', category: 'cool', params: { brightness: 0.08, contrast: 1.12, temperature: -0.45, tint: 0.05 } },
  { id: 'cool-alpine-air', name: 'Alpine Air', category: 'cool', params: { brightness: 0.06, contrast: 1.1, temperature: -0.28, sharpness: 0.2 } },
  { id: 'cool-deep-ocean', name: 'Deep Ocean', category: 'cool', params: { brightness: -0.04, contrast: 1.22, temperature: -0.5, vignette: 0.35 } },
  { id: 'cool-arctic-mist', name: 'Arctic Mist', category: 'cool', params: { brightness: 0.12, contrast: 0.95, temperature: -0.32, fade: 0.1 } },
  { id: 'cool-breeze', name: 'Cool Breeze', category: 'cool', params: { brightness: 0.05, contrast: 1.04, temperature: -0.22, saturation: 1.04 } },
  { id: 'cool-steel', name: 'Steel', category: 'cool', params: { brightness: 0.02, contrast: 1.18, temperature: -0.25, saturation: 0.82 } },
  { id: 'cool-ice-crystal', name: 'Ice Crystal', category: 'cool', params: { brightness: 0.11, contrast: 1.15, temperature: -0.38, bloom: 0.25 } },
  { id: 'cool-cobalt', name: 'Cobalt', category: 'cool', params: { brightness: -0.02, contrast: 1.25, temperature: -0.48, saturation: 1.2 } },
  { id: 'cool-polar', name: 'Polar', category: 'cool', params: { brightness: 0.14, contrast: 1.08, temperature: -0.42, saturation: 0.9 } },
  { id: 'cool-frozen-lake', name: 'Frozen Lake', category: 'cool', params: { brightness: 0.03, contrast: 1.14, temperature: -0.36, fade: 0.08 } },
  { id: 'cool-winter-dawn', name: 'Winter Dawn', category: 'cool', params: { brightness: 0.07, contrast: 1.06, temperature: -0.3, tint: 0.08 } },
  { id: 'cool-cyan-shimmer', name: 'Cyan Shimmer', category: 'cool', params: { brightness: 0.08, contrast: 1.1, temperature: -0.4, tint: -0.1, bloom: 0.22 } },
  { id: 'cool-cerulean', name: 'Cerulean', category: 'cool', params: { brightness: 0.05, contrast: 1.12, temperature: -0.34, saturation: 1.15 } },
  { id: 'cool-mountain-stream', name: 'Mountain Stream', category: 'cool', params: { brightness: 0.06, contrast: 1.08, temperature: -0.26, sharpness: 0.25 } },
  { id: 'cool-teal-frost', name: 'Teal Frost', category: 'cool', params: { brightness: 0.04, contrast: 1.15, temperature: -0.38, tint: -0.15 } },
  { id: 'cool-cold-stone', name: 'Cold Stone', category: 'cool', params: { brightness: 0.0, contrast: 1.16, temperature: -0.24, saturation: 0.75 } },
  { id: 'cool-midnight-chill', name: 'Midnight Chill', category: 'cool', params: { brightness: -0.06, contrast: 1.26, temperature: -0.45, vignette: 0.4 } },
  { id: 'cool-boreal', name: 'Boreal', category: 'cool', params: { brightness: 0.05, contrast: 1.1, temperature: -0.32, tint: -0.08, bloom: 0.18 } },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 4: BLACK & WHITE (20 filters)
  // ───────────────────────────────────────────────────────────────────────────
  { id: 'bw-classic-noir', name: 'Classic Noir', category: 'bw', params: { saturation: 0.0, contrast: 1.35, vignette: 0.35, brightness: -0.02 } },
  { id: 'bw-high-contrast', name: 'High Contrast B&W', category: 'bw', params: { saturation: 0.0, contrast: 1.55, brightness: 0.02 } },
  { id: 'bw-silver-screen', name: 'Silver Screen', category: 'bw', params: { saturation: 0.0, contrast: 1.18, bloom: 0.25, brightness: 0.06 } },
  { id: 'bw-matte-black', name: 'Matte Black', category: 'bw', params: { saturation: 0.0, contrast: 1.1, fade: 0.18, brightness: 0.02 } },
  { id: 'bw-charcoal', name: 'Charcoal', category: 'bw', params: { saturation: 0.0, contrast: 1.4, brightness: -0.06, grain: 0.2 } },
  { id: 'bw-monochrome-film', name: 'Monochrome Film', category: 'bw', params: { saturation: 0.0, contrast: 1.25, grain: 0.25, vignette: 0.2 } },
  { id: 'bw-dark-room', name: 'Dark Room', category: 'bw', params: { saturation: 0.0, contrast: 1.45, brightness: -0.08, vignette: 0.45 } },
  { id: 'bw-inked', name: 'Inked', category: 'bw', params: { saturation: 0.0, contrast: 1.6, brightness: 0.0, sharpness: 0.3 } },
  { id: 'bw-pencil-lead', name: 'Pencil Lead', category: 'bw', params: { saturation: 0.0, contrast: 1.15, brightness: 0.08, grain: 0.15 } },
  { id: 'bw-granite', name: 'Granite', category: 'bw', params: { saturation: 0.0, contrast: 1.22, sharpness: 0.4, brightness: 0.0 } },
  { id: 'bw-moody-shadows', name: 'Moody Shadows', category: 'bw', params: { saturation: 0.0, contrast: 1.38, brightness: -0.05, fade: 0.08 } },
  { id: 'bw-silvertone', name: 'Silvertone', category: 'bw', params: { saturation: 0.0, contrast: 1.2, brightness: 0.07, temperature: -0.05 } },
  { id: 'bw-onyx', name: 'Onyx', category: 'bw', params: { saturation: 0.0, contrast: 1.5, brightness: -0.04, vignette: 0.3 } },
  { id: 'bw-soft-grayscale', name: 'Soft Grayscale', category: 'bw', params: { saturation: 0.0, contrast: 0.95, brightness: 0.05, bloom: 0.15 } },
  { id: 'bw-punchy', name: 'Punchy B&W', category: 'bw', params: { saturation: 0.0, contrast: 1.48, brightness: 0.04, sharpness: 0.2 } },
  { id: 'bw-street-mono', name: 'Street Mono', category: 'bw', params: { saturation: 0.0, contrast: 1.32, grain: 0.3, vignette: 0.25 } },
  { id: 'bw-daguerre', name: 'Vintage Daguerre', category: 'bw', params: { saturation: 0.0, contrast: 1.12, fade: 0.22, grain: 0.35, vignette: 0.5 } },
  { id: 'bw-obsidian', name: 'Obsidian', category: 'bw', params: { saturation: 0.0, contrast: 1.65, brightness: -0.08 } },
  { id: 'bw-soot', name: 'Soot', category: 'bw', params: { saturation: 0.0, contrast: 1.28, brightness: -0.03, grain: 0.18 } },
  { id: 'bw-pure-mono', name: 'Pure Mono', category: 'bw', params: { saturation: 0.0, contrast: 1.05, brightness: 0.0 } },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 5: FILM & VINTAGE (20 filters)
  // ───────────────────────────────────────────────────────────────────────────
  { id: 'film-kodak-400', name: 'Kodak 400', category: 'vintage', params: { contrast: 1.12, temperature: 0.18, grain: 0.25, fade: 0.08, saturation: 1.1 } },
  { id: 'film-fuji-velvia', name: 'Fuji Velvia', category: 'vintage', params: { contrast: 1.24, saturation: 1.35, temperature: -0.1, tint: -0.08 } },
  { id: 'film-portra-160', name: 'Portra 160', category: 'vintage', params: { contrast: 1.05, temperature: 0.12, saturation: 1.04, skinSmooth: 0.2, fade: 0.06 } },
  { id: 'film-polaroid-600', name: 'Polaroid 600', category: 'vintage', params: { contrast: 1.15, temperature: 0.15, fade: 0.16, vignette: 0.3, grain: 0.2 } },
  { id: 'film-disposable-90s', name: 'Disposable 90s', category: 'vintage', params: { contrast: 1.22, temperature: 0.2, grain: 0.32, vignette: 0.38, brightness: 0.04 } },
  { id: 'film-1970s-gold', name: '1970s Gold', category: 'vintage', params: { contrast: 1.1, temperature: 0.42, tint: -0.06, fade: 0.14, saturation: 1.15 } },
  { id: 'film-super-8', name: 'Super 8', category: 'vintage', params: { contrast: 1.18, temperature: 0.28, grain: 0.4, vignette: 0.45, fade: 0.12 } },
  { id: 'film-old-postcard', name: 'Old Postcard', category: 'vintage', params: { contrast: 1.02, temperature: 0.3, fade: 0.2, saturation: 0.85 } },
  { id: 'film-faded-memory', name: 'Faded Memory', category: 'vintage', params: { contrast: 0.95, fade: 0.26, temperature: 0.1, saturation: 0.8, bloom: 0.18 } },
  { id: 'film-35mm-grain', name: '35mm Grain', category: 'vintage', params: { contrast: 1.14, grain: 0.45, sharpness: 0.2, saturation: 1.06 } },
  { id: 'film-ektachrome', name: 'Ektachrome', category: 'vintage', params: { contrast: 1.25, saturation: 1.2, temperature: -0.15, tint: 0.05 } },
  { id: 'film-technicolor', name: 'Technicolor', category: 'vintage', params: { contrast: 1.3, saturation: 1.4, temperature: 0.12 } },
  { id: 'film-ilford-xp2', name: 'Ilford XP2', category: 'vintage', params: { saturation: 0.05, contrast: 1.22, grain: 0.3, temperature: 0.1 } },
  { id: 'film-analog-tape', name: 'Analog Tape', category: 'vintage', params: { contrast: 1.08, fade: 0.15, tint: 0.08, grain: 0.28 } },
  { id: 'film-antique-sepia', name: 'Antique Sepia', category: 'vintage', params: { saturation: 0.2, temperature: 0.6, fade: 0.18, vignette: 0.4 } },
  { id: 'film-warm-kodachrome', name: 'Warm Kodachrome', category: 'vintage', params: { contrast: 1.2, temperature: 0.26, saturation: 1.18, fade: 0.05 } },
  { id: 'film-retro-stock', name: 'Retro Film Stock', category: 'vintage', params: { contrast: 1.14, temperature: 0.16, grain: 0.22, fade: 0.1 } },
  { id: 'film-1985-summer', name: '1985 Summer', category: 'vintage', params: { brightness: 0.06, contrast: 1.16, temperature: 0.32, saturation: 1.22, vignette: 0.25 } },
  { id: 'film-dust-scratches', name: 'Dust & Scratches', category: 'vintage', params: { contrast: 1.15, grain: 0.5, fade: 0.14, vignette: 0.35 } },
  { id: 'film-negative', name: 'Film Negative', category: 'vintage', params: { contrast: 1.08, fade: 0.22, temperature: -0.12, saturation: 0.9 } },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 6: AESTHETIC (20 filters)
  // ───────────────────────────────────────────────────────────────────────────
  { id: 'aes-cream-coffee', name: 'Cream & Coffee', category: 'aesthetic', params: { contrast: 1.08, temperature: 0.22, fade: 0.12, saturation: 0.88, brightness: 0.04 } },
  { id: 'aes-muted-beige', name: 'Muted Beige', category: 'aesthetic', params: { contrast: 1.02, temperature: 0.18, saturation: 0.8, fade: 0.1 } },
  { id: 'aes-dusty-rose', name: 'Dusty Rose', category: 'aesthetic', params: { contrast: 1.05, tint: 0.2, temperature: 0.1, saturation: 0.92, bloom: 0.15 } },
  { id: 'aes-sage-green', name: 'Sage Green', category: 'aesthetic', params: { contrast: 1.06, tint: -0.18, saturation: 0.86, temperature: -0.05 } },
  { id: 'aes-minimalist', name: 'Minimalist', category: 'aesthetic', params: { brightness: 0.06, contrast: 1.1, saturation: 0.9, sharpness: 0.25 } },
  { id: 'aes-alabaster', name: 'Alabaster', category: 'aesthetic', params: { brightness: 0.12, contrast: 0.98, temperature: -0.04, bloom: 0.22 } },
  { id: 'aes-matcha', name: 'Matcha', category: 'aesthetic', params: { contrast: 1.04, tint: -0.22, saturation: 0.95, brightness: 0.03 } },
  { id: 'aes-oat-milk', name: 'Oat Milk', category: 'aesthetic', params: { brightness: 0.08, contrast: 0.96, temperature: 0.14, fade: 0.14 } },
  { id: 'aes-latte-art', name: 'Latte Art', category: 'aesthetic', params: { contrast: 1.12, temperature: 0.25, saturation: 0.9, vignette: 0.2 } },
  { id: 'aes-earthy-clay', name: 'Earthy Clay', category: 'aesthetic', params: { contrast: 1.16, temperature: 0.28, tint: -0.06, saturation: 1.05 } },
  { id: 'aes-olive-branch', name: 'Olive Branch', category: 'aesthetic', params: { contrast: 1.08, tint: -0.15, temperature: 0.12, saturation: 0.92 } },
  { id: 'aes-linen', name: 'Linen', category: 'aesthetic', params: { brightness: 0.06, contrast: 1.02, temperature: 0.08, fade: 0.12, grain: 0.12 } },
  { id: 'aes-driftwood', name: 'Driftwood', category: 'aesthetic', params: { contrast: 1.14, saturation: 0.78, temperature: 0.15, fade: 0.08 } },
  { id: 'aes-vanilla-haze', name: 'Vanilla Haze', category: 'aesthetic', params: { brightness: 0.1, contrast: 0.94, temperature: 0.2, bloom: 0.3 } },
  { id: 'aes-terracotta-min', name: 'Terracotta Minimal', category: 'aesthetic', params: { contrast: 1.12, temperature: 0.26, tint: -0.04, fade: 0.06 } },
  { id: 'aes-modern-neutral', name: 'Modern Neutral', category: 'aesthetic', params: { brightness: 0.04, contrast: 1.06, saturation: 0.85, sharpness: 0.18 } },
  { id: 'aes-clean-studio', name: 'Clean Studio', category: 'aesthetic', params: { brightness: 0.08, contrast: 1.12, saturation: 1.02, sharpness: 0.3 } },
  { id: 'aes-chai', name: 'Chai', category: 'aesthetic', params: { contrast: 1.15, temperature: 0.32, saturation: 0.96, vignette: 0.18 } },
  { id: 'aes-bisque', name: 'Bisque', category: 'aesthetic', params: { brightness: 0.07, contrast: 1.0, temperature: 0.16, fade: 0.1 } },
  { id: 'aes-urban', name: 'Urban Aesthetic', category: 'aesthetic', params: { contrast: 1.2, saturation: 0.82, fade: 0.08, vignette: 0.25 } },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 7: NEON & CYBER (20 filters)
  // ───────────────────────────────────────────────────────────────────────────
  { id: 'neon-cyberpunk', name: 'Cyberpunk', category: 'neon', params: { contrast: 1.35, temperature: -0.3, tint: 0.35, saturation: 1.45, vignette: 0.35 } },
  { id: 'neon-tokyo', name: 'Tokyo Neon', category: 'neon', params: { contrast: 1.28, temperature: -0.2, tint: 0.4, saturation: 1.4, bloom: 0.3 } },
  { id: 'neon-electric-violet', name: 'Electric Violet', category: 'neon', params: { contrast: 1.3, tint: 0.55, temperature: -0.25, saturation: 1.5 } },
  { id: 'neon-synthwave', name: 'Synthwave', category: 'neon', params: { contrast: 1.32, tint: 0.45, temperature: -0.15, saturation: 1.55, vignette: 0.4 } },
  { id: 'neon-acid-lime', name: 'Acid Lime', category: 'neon', params: { contrast: 1.25, tint: -0.5, temperature: 0.1, saturation: 1.4 } },
  { id: 'neon-matrix', name: 'Matrix Green', category: 'neon', params: { contrast: 1.4, tint: -0.6, saturation: 1.35, brightness: -0.05 } },
  { id: 'neon-laser-pink', name: 'Laser Pink', category: 'neon', params: { contrast: 1.26, tint: 0.6, saturation: 1.6, bloom: 0.35 } },
  { id: 'neon-night-city', name: 'Night City', category: 'neon', params: { contrast: 1.38, temperature: -0.35, saturation: 1.35, vignette: 0.45, brightness: -0.04 } },
  { id: 'neon-ultraviolet', name: 'Ultraviolet', category: 'neon', params: { contrast: 1.3, tint: 0.7, temperature: -0.4, saturation: 1.5 } },
  { id: 'neon-tron-blue', name: 'Tron Blue', category: 'neon', params: { contrast: 1.4, temperature: -0.6, tint: -0.15, saturation: 1.6, bloom: 0.4 } },
  { id: 'neon-hyperpop', name: 'Hyperpop', category: 'neon', params: { brightness: 0.1, contrast: 1.3, saturation: 1.7, bloom: 0.25 } },
  { id: 'neon-vaporwave', name: 'Vaporwave', category: 'neon', params: { contrast: 1.2, tint: 0.35, temperature: -0.25, fade: 0.15, bloom: 0.3 } },
  { id: 'neon-arcade-84', name: 'Arcade 84', category: 'neon', params: { contrast: 1.35, saturation: 1.5, grain: 0.25, vignette: 0.35 } },
  { id: 'neon-magenta', name: 'Neon Magenta', category: 'neon', params: { contrast: 1.25, tint: 0.65, saturation: 1.55, bloom: 0.3 } },
  { id: 'neon-radioactive', name: 'Radioactive', category: 'neon', params: { contrast: 1.32, tint: -0.45, saturation: 1.6, bloom: 0.35 } },
  { id: 'neon-future-glow', name: 'Future Glow', category: 'neon', params: { brightness: 0.08, contrast: 1.22, bloom: 0.45, temperature: -0.2 } },
  { id: 'neon-plasma', name: 'Plasma', category: 'neon', params: { contrast: 1.36, hue: 0.5, saturation: 1.45, bloom: 0.28 } },
  { id: 'neon-glitch-pulse', name: 'Glitch Pulse', category: 'neon', params: { contrast: 1.38, saturation: 1.5, sharpness: 0.45, tint: 0.2 } },
  { id: 'neon-cyber-teal', name: 'Cyber Teal', category: 'neon', params: { contrast: 1.3, temperature: -0.5, tint: -0.2, saturation: 1.5 } },
  { id: 'neon-cosmic-ray', name: 'Cosmic Ray', category: 'neon', params: { contrast: 1.42, tint: 0.4, temperature: -0.3, bloom: 0.4 } },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 8: DREAMY & SOFT (20 filters)
  // ───────────────────────────────────────────────────────────────────────────
  { id: 'drm-pastel-cloud', name: 'Pastel Cloud', category: 'dreamy', params: { brightness: 0.1, contrast: 0.92, bloom: 0.4, saturation: 1.08, fade: 0.1 } },
  { id: 'drm-angel-aura', name: 'Angel Aura', category: 'dreamy', params: { brightness: 0.14, contrast: 0.88, bloom: 0.55, skinSmooth: 0.4 } },
  { id: 'drm-cotton-candy', name: 'Cotton Candy', category: 'dreamy', params: { brightness: 0.08, contrast: 0.95, tint: 0.25, temperature: -0.1, bloom: 0.35 } },
  { id: 'drm-ethereal', name: 'Ethereal', category: 'dreamy', params: { brightness: 0.12, contrast: 0.9, bloom: 0.5, temperature: -0.15 } },
  { id: 'drm-fairy-dust', name: 'Fairy Dust', category: 'dreamy', params: { brightness: 0.11, contrast: 0.96, bloom: 0.45, temperature: 0.15, grain: 0.1 } },
  { id: 'drm-silk-bloom', name: 'Silk Bloom', category: 'dreamy', params: { brightness: 0.07, contrast: 0.94, bloom: 0.38, skinSmooth: 0.5 } },
  { id: 'drm-heavenly', name: 'Heavenly', category: 'dreamy', params: { brightness: 0.15, contrast: 0.85, bloom: 0.6, fade: 0.12 } },
  { id: 'drm-starlight-glow', name: 'Starlight Glow', category: 'dreamy', params: { brightness: 0.09, contrast: 1.02, bloom: 0.42, temperature: -0.12 } },
  { id: 'drm-moonbeam', name: 'Moonbeam', category: 'dreamy', params: { brightness: 0.05, contrast: 0.96, temperature: -0.28, bloom: 0.36 } },
  { id: 'drm-cloud-nine', name: 'Cloud Nine', category: 'dreamy', params: { brightness: 0.13, contrast: 0.91, bloom: 0.48, fade: 0.08 } },
  { id: 'drm-soft-mist', name: 'Soft Mist', category: 'dreamy', params: { brightness: 0.06, contrast: 0.9, bloom: 0.35, fade: 0.16 } },
  { id: 'drm-whisper', name: 'Whisper', category: 'dreamy', params: { brightness: 0.04, contrast: 0.93, bloom: 0.3, saturation: 0.92 } },
  { id: 'drm-velvet-dream', name: 'Velvet Dream', category: 'dreamy', params: { brightness: 0.05, contrast: 1.04, bloom: 0.32, vignette: 0.25 } },
  { id: 'drm-bliss', name: 'Bliss', category: 'dreamy', params: { brightness: 0.11, contrast: 0.95, bloom: 0.4, temperature: 0.12 } },
  { id: 'drm-twilight-haze', name: 'Twilight Haze', category: 'dreamy', params: { brightness: 0.03, contrast: 0.98, bloom: 0.35, tint: 0.18, temperature: -0.15 } },
  { id: 'drm-gentle-shimmer', name: 'Gentle Shimmer', category: 'dreamy', params: { brightness: 0.08, contrast: 1.01, bloom: 0.38, skinSmooth: 0.3 } },
  { id: 'drm-dreamland', name: 'Dreamland', category: 'dreamy', params: { brightness: 0.1, contrast: 0.88, bloom: 0.52, saturation: 1.15 } },
  { id: 'drm-opal', name: 'Opal', category: 'dreamy', params: { brightness: 0.09, contrast: 0.97, bloom: 0.42, tint: 0.12 } },
  { id: 'drm-seraphic', name: 'Seraphic', category: 'dreamy', params: { brightness: 0.16, contrast: 0.86, bloom: 0.62 } },
  { id: 'drm-wonderland', name: 'Wonderland', category: 'dreamy', params: { brightness: 0.07, contrast: 1.05, bloom: 0.35, saturation: 1.25 } },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 9: MOODY & CINEMATIC (20 filters)
  // ───────────────────────────────────────────────────────────────────────────
  { id: 'cine-teal-orange', name: 'Teal & Orange', category: 'cinematic', params: { contrast: 1.28, temperature: -0.22, tint: -0.05, saturation: 1.2, shadowColor: [0.0, 0.14, 0.2], highlightColor: [0.22, 0.12, 0.0] } },
  { id: 'cine-fincher-green', name: 'Fincher Green', category: 'cinematic', params: { contrast: 1.32, tint: -0.35, temperature: -0.1, vignette: 0.35, brightness: -0.04 } },
  { id: 'cine-blade-runner', name: 'Blade Runner', category: 'cinematic', params: { contrast: 1.35, temperature: 0.25, tint: 0.2, saturation: 1.3, vignette: 0.4 } },
  { id: 'cine-dark-knight', name: 'Dark Knight', category: 'cinematic', params: { contrast: 1.45, brightness: -0.08, temperature: -0.3, saturation: 0.85, vignette: 0.5 } },
  { id: 'cine-moody-forest', name: 'Moody Forest', category: 'cinematic', params: { contrast: 1.25, tint: -0.25, brightness: -0.05, vignette: 0.38, saturation: 0.95 } },
  { id: 'cine-shadowfall', name: 'Shadowfall', category: 'cinematic', params: { contrast: 1.38, brightness: -0.07, fade: 0.08, vignette: 0.42 } },
  { id: 'cine-anamorphic-blue', name: 'Anamorphic Blue', category: 'cinematic', params: { contrast: 1.3, temperature: -0.42, saturation: 1.15, bloom: 0.2, vignette: 0.3 } },
  { id: 'cine-espionage', name: 'Espionage', category: 'cinematic', params: { contrast: 1.26, temperature: -0.15, saturation: 0.78, grain: 0.25 } },
  { id: 'cine-crime-noir', name: 'Crime Noir', category: 'cinematic', params: { contrast: 1.42, brightness: -0.06, saturation: 0.4, vignette: 0.45 } },
  { id: 'cine-dystopia', name: 'Dystopia', category: 'cinematic', params: { contrast: 1.34, temperature: 0.18, tint: -0.18, saturation: 0.75, fade: 0.1 } },
  { id: 'cine-low-key', name: 'Low Key', category: 'cinematic', params: { brightness: -0.12, contrast: 1.5, vignette: 0.55 } },
  { id: 'cine-gotham', name: 'Gotham', category: 'cinematic', params: { contrast: 1.4, temperature: -0.25, saturation: 0.7, vignette: 0.4 } },
  { id: 'cine-twilight', name: 'Cinematic Twilight', category: 'cinematic', params: { contrast: 1.22, temperature: -0.32, tint: 0.15, vignette: 0.32 } },
  { id: 'cine-dramatic-dusk', name: 'Dramatic Dusk', category: 'cinematic', params: { contrast: 1.28, temperature: 0.22, tint: 0.25, vignette: 0.38 } },
  { id: 'cine-deep-ember', name: 'Deep Ember', category: 'cinematic', params: { contrast: 1.36, temperature: 0.38, brightness: -0.05, vignette: 0.4 } },
  { id: 'cine-bleach-bypass', name: 'Bleach Bypass', category: 'cinematic', params: { contrast: 1.5, saturation: 0.5, brightness: 0.04, sharpness: 0.3 } },
  { id: 'cine-melancholy', name: 'Melancholy', category: 'cinematic', params: { contrast: 1.12, temperature: -0.2, saturation: 0.8, fade: 0.15 } },
  { id: 'cine-interstellar', name: 'Interstellar', category: 'cinematic', params: { contrast: 1.3, temperature: 0.15, saturation: 1.1, bloom: 0.18, vignette: 0.3 } },
  { id: 'cine-thriller', name: 'Thriller', category: 'cinematic', params: { contrast: 1.44, brightness: -0.08, temperature: -0.18, vignette: 0.48 } },
  { id: 'cine-eclipse', name: 'Eclipse', category: 'cinematic', params: { contrast: 1.52, brightness: -0.1, saturation: 0.9, vignette: 0.6 } },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 10: PASTEL (20 filters)
  // ───────────────────────────────────────────────────────────────────────────
  { id: 'pas-lavender-haze', name: 'Lavender Haze', category: 'pastel', params: { brightness: 0.06, contrast: 0.98, tint: 0.32, temperature: -0.12, bloom: 0.2 } },
  { id: 'pas-baby-blue', name: 'Baby Blue', category: 'pastel', params: { brightness: 0.08, contrast: 0.96, temperature: -0.32, bloom: 0.18, saturation: 1.05 } },
  { id: 'pas-mint-sorbet', name: 'Mint Sorbet', category: 'pastel', params: { brightness: 0.07, contrast: 0.97, tint: -0.28, temperature: -0.08, bloom: 0.2 } },
  { id: 'pas-peach-bellini', name: 'Peach Bellini', category: 'pastel', params: { brightness: 0.09, contrast: 1.0, temperature: 0.22, tint: 0.08, bloom: 0.22 } },
  { id: 'pas-soft-lilac', name: 'Soft Lilac', category: 'pastel', params: { brightness: 0.05, contrast: 0.95, tint: 0.38, bloom: 0.25 } },
  { id: 'pas-buttercup', name: 'Buttercup', category: 'pastel', params: { brightness: 0.1, contrast: 1.02, temperature: 0.26, saturation: 1.12 } },
  { id: 'pas-blush-pink', name: 'Blush Pink', category: 'pastel', params: { brightness: 0.08, contrast: 0.98, tint: 0.26, bloom: 0.2, skinSmooth: 0.25 } },
  { id: 'pas-periwinkle', name: 'Periwinkle', category: 'pastel', params: { brightness: 0.06, contrast: 0.97, temperature: -0.25, tint: 0.18, bloom: 0.18 } },
  { id: 'pas-pistachio', name: 'Pistachio', category: 'pastel', params: { brightness: 0.06, contrast: 0.99, tint: -0.22, temperature: 0.06 } },
  { id: 'pas-powder-pink', name: 'Powder Pink', category: 'pastel', params: { brightness: 0.11, contrast: 0.93, tint: 0.3, bloom: 0.3 } },
  { id: 'pas-seafoam', name: 'Seafoam', category: 'pastel', params: { brightness: 0.08, contrast: 0.96, tint: -0.2, temperature: -0.18, bloom: 0.22 } },
  { id: 'pas-apricot-gelato', name: 'Apricot Gelato', category: 'pastel', params: { brightness: 0.09, contrast: 1.01, temperature: 0.24, bloom: 0.18 } },
  { id: 'pas-chalk-white', name: 'Chalk White', category: 'pastel', params: { brightness: 0.14, contrast: 0.92, fade: 0.14, bloom: 0.25 } },
  { id: 'pas-macaron', name: 'Macaron', category: 'pastel', params: { brightness: 0.07, contrast: 1.04, tint: 0.15, saturation: 1.15 } },
  { id: 'pas-wisteria', name: 'Wisteria', category: 'pastel', params: { brightness: 0.06, contrast: 0.96, tint: 0.34, temperature: -0.1 } },
  { id: 'pas-sweet-cream', name: 'Sweet Cream', category: 'pastel', params: { brightness: 0.1, contrast: 0.94, temperature: 0.14, bloom: 0.28 } },
  { id: 'pas-vanilla-sky', name: 'Vanilla Sky', category: 'pastel', params: { brightness: 0.08, contrast: 0.97, temperature: 0.18, tint: 0.08, bloom: 0.24 } },
  { id: 'pas-marshmallow', name: 'Marshmallow', category: 'pastel', params: { brightness: 0.12, contrast: 0.9, bloom: 0.35, skinSmooth: 0.3 } },
  { id: 'pas-pastel-dawn', name: 'Pastel Dawn', category: 'pastel', params: { brightness: 0.07, contrast: 1.01, temperature: 0.12, tint: 0.16, bloom: 0.22 } },
  { id: 'pas-rose-quartz', name: 'Rose Quartz', category: 'pastel', params: { brightness: 0.08, contrast: 0.99, tint: 0.28, temperature: 0.05, bloom: 0.25 } },
];

/**
 * Returns a filter by its ID, falling back to Original if not found
 */
export function getFilterById(id: string): FilterDefinition {
  const found = FILTERS_CATALOG.find((f) => f.id === id);
  return found || FILTERS_CATALOG[0];
}
