/**
 * Filter Thumbnail Generator
 * Dynamically generates rich, vector-based SVG data URIs for all 200 filters.
 * Ensures zero external image requests, instant offline availability, and crisp retina rendering.
 */

import { FilterDefinition } from './types';

// Palette mapping for category aesthetics
const CATEGORY_COLORS: Record<string, { bg1: string; bg2: string; accent: string }> = {
  beauty: { bg1: '#ffe4e6', bg2: '#fecdd3', accent: '#f43f5e' },
  aesthetic: { bg1: '#fef3c7', bg2: '#fde68a', accent: '#d97706' },
  cinematic: { bg1: '#1e293b', bg2: '#0f172a', accent: '#38bdf8' },
  retro: { bg1: '#fef9c3', bg2: '#fed7aa', accent: '#ea580c' },
  'face-effects': { bg1: '#fce7f3', bg2: '#fbcfe8', accent: '#ec4899' },
  accessories: { bg1: '#e0e7ff', bg2: '#c7d2fe', accent: '#6366f1' },
  fantasy: { bg1: '#ede9fe', bg2: '#ddd6fe', accent: '#8b5cf6' },
  light: { bg1: '#fffbeb', bg2: '#fef08a', accent: '#eab308' },
  distortion: { bg1: '#ccfbf1', bg2: '#99f6e4', accent: '#0d9488' },
  nature: { bg1: '#dcfce7', bg2: '#bbf7d0', accent: '#16a34a' },
};

// Generates an SVG icon element for specific filter styles
function getIconForFilter(filter: FilterDefinition): string {
  const id = filter.id;
  const cat = filter.category;

  // Accessories
  if (id.includes('sunglasses') || id.includes('glasses') || id.includes('visor')) {
    if (id.includes('round')) {
      return `<circle cx="28" cy="40" r="12" fill="none" stroke="#fff" stroke-width="3.5" /><circle cx="52" cy="40" r="12" fill="none" stroke="#fff" stroke-width="3.5" /><path d="M40 40h4" stroke="#fff" stroke-width="3.5" />`;
    }
    if (id.includes('heart')) {
      return `<path d="M22 36c-3-4-8-2-8 3 0 6 12 13 14 14 2-1 14-8 14-14 0-5-5-7-8-3l-6 6-6-6z" fill="#ec4899" /><path d="M44 36c-3-4-8-2-8 3 0 6 12 13 14 14 2-1 14-8 14-14 0-5-5-7-8-3l-6 6-6-6z" fill="#ec4899" />`;
    }
    if (id.includes('star')) {
      return `<polygon points="28,26 31,34 39,34 33,39 35,47 28,42 21,47 23,39 17,34 25,34" fill="#fbbf24" /><polygon points="52,26 55,34 63,34 57,39 59,47 52,42 45,47 47,39 41,34 49,34" fill="#fbbf24" />`;
    }
    return `<rect x="16" y="32" width="20" height="15" rx="5" fill="#18181b" stroke="#fff" stroke-width="2" /><rect x="44" y="32" width="20" height="15" rx="5" fill="#18181b" stroke="#fff" stroke-width="2" /><path d="M36 38h8" stroke="#fff" stroke-width="2.5" />`;
  }
  if (id.includes('crown') || id.includes('tiara')) {
    return `<polygon points="18,48 24,30 40,42 56,30 62,48" fill="#f59e0b" stroke="#fef08a" stroke-width="2" /><circle cx="40" cy="48" r="3" fill="#ef4444" /><circle cx="24" cy="48" r="2.5" fill="#3b82f6" /><circle cx="56" cy="48" r="2.5" fill="#10b981" />`;
  }
  if (id.includes('halo')) {
    return `<ellipse cx="40" cy="36" rx="24" ry="8" fill="none" stroke="#fbbf24" stroke-width="4" filter="drop-shadow(0 0 4px #fde047)" />`;
  }
  if (id.includes('ears')) {
    if (id.includes('cat')) {
      return `<polygon points="20,44 16,22 34,34" fill="#f43f5e" /><polygon points="60,44 64,22 46,34" fill="#f43f5e" />`;
    }
    if (id.includes('bunny')) {
      return `<ellipse cx="26" cy="24" rx="7" ry="18" fill="#fda4af" stroke="#fff" stroke-width="2" /><ellipse cx="54" cy="24" rx="7" ry="18" fill="#fda4af" stroke="#fff" stroke-width="2" />`;
    }
    return `<circle cx="22" cy="30" r="12" fill="#78350f" /><circle cx="58" cy="30" r="12" fill="#78350f" />`;
  }
  if (id.includes('horns')) {
    return `<path d="M22 44 Q 16 20, 28 16 Q 26 28, 30 44 Z" fill="#dc2626" /><path d="M58 44 Q 64 20, 52 16 Q 54 28, 50 44 Z" fill="#dc2626" />`;
  }

  // Face Effects / Makeup
  if (id.includes('blush')) {
    return `<circle cx="24" cy="42" r="12" fill="#fb7185" opacity="0.8" filter="blur(2px)" /><circle cx="56" cy="42" r="12" fill="#fb7185" opacity="0.8" filter="blur(2px)" />`;
  }
  if (id.includes('freckles')) {
    return `<circle cx="26" cy="40" r="1.5" fill="#78350f" /><circle cx="30" cy="43" r="1.8" fill="#78350f" /><circle cx="50" cy="42" r="1.5" fill="#78350f" /><circle cx="54" cy="39" r="1.8" fill="#78350f" /><circle cx="40" cy="44" r="1.5" fill="#78350f" />`;
  }
  if (id.includes('sparkle') || id.includes('glitter') || id.includes('starlight')) {
    return `<path d="M40 20 Q 40 36, 56 36 Q 40 36, 40 52 Q 40 36, 24 36 Q 40 36, 40 20 Z" fill="#fbbf24" /><circle cx="22" cy="24" r="3" fill="#fff" /><circle cx="58" cy="48" r="2.5" fill="#fff" />`;
  }
  if (id.includes('butterfly')) {
    return `<path d="M40 40 Q 25 25, 20 32 Q 22 45, 40 42 Q 26 48, 25 56 Q 36 60, 40 42 Z" fill="#ec4899" /><path d="M40 40 Q 55 25, 60 32 Q 58 45, 40 42 Q 54 48, 55 56 Q 44 60, 40 42 Z" fill="#a855f7" />`;
  }
  if (id.includes('rainbow')) {
    return `<path d="M20 52 A 20 20 0 0 1 60 52" fill="none" stroke="#ef4444" stroke-width="4" /><path d="M23 52 A 17 17 0 0 1 57 52" fill="none" stroke="#eab308" stroke-width="3.5" /><path d="M26 52 A 14 14 0 0 1 54 52" fill="none" stroke="#3b82f6" stroke-width="3.5" />`;
  }

  // Light & Glow
  if (cat === 'light' || id.includes('sun') || id.includes('flare') || id.includes('glow')) {
    return `<circle cx="40" cy="40" r="14" fill="#fbbf24" /><g stroke="#fbbf24" stroke-width="3" stroke-linecap="round"><line x1="40" y1="14" x2="40" y2="20" /><line x1="40" y1="60" x2="40" y2="66" /><line x1="14" y1="40" x2="20" y2="40" /><line x1="60" y1="40" x2="66" y2="40" /><line x1="22" y1="22" x2="26" y2="26" /><line x1="54" y1="54" x2="58" y2="58" /><line x1="22" y1="58" x2="26" y2="54" /><line x1="54" y1="26" x2="58" y2="22" /></g>`;
  }

  // Nature
  if (id.includes('snow') || id.includes('winter') || id.includes('frost')) {
    return `<g stroke="#e0f2fe" stroke-width="3" stroke-linecap="round"><line x1="40" y1="20" x2="40" y2="60" /><line x1="20" y1="40" x2="60" y2="40" /><line x1="26" y1="26" x2="54" y2="54" /><line x1="26" y1="54" x2="54" y2="26" /></g><circle cx="40" cy="40" r="4" fill="#38bdf8" />`;
  }
  if (id.includes('leaf') || id.includes('leaves') || id.includes('autumn')) {
    return `<path d="M26 56 C 22 36, 36 22, 54 24 C 56 42, 42 56, 26 56 Z" fill="#ea580c" /><line x1="26" y1="56" x2="46" y2="34" stroke="#7c2d12" stroke-width="2" />`;
  }
  if (id.includes('blossom') || id.includes('flower') || id.includes('petal') || id.includes('spring')) {
    return `<circle cx="40" cy="30" r="8" fill="#fda4af" /><circle cx="50" cy="38" r="8" fill="#fda4af" /><circle cx="46" cy="50" r="8" fill="#fda4af" /><circle cx="34" cy="50" r="8" fill="#fda4af" /><circle cx="30" cy="38" r="8" fill="#fda4af" /><circle cx="40" cy="40" r="6" fill="#fde047" />`;
  }
  if (id.includes('rain')) {
    return `<g stroke="#60a5fa" stroke-width="3" stroke-linecap="round"><line x1="28" y1="26" x2="22" y2="42" /><line x1="44" y1="22" x2="38" y2="38" /><line x1="56" y1="28" x2="50" y2="44" /><line x1="34" y1="44" x2="28" y2="60" /><line x1="48" y1="42" x2="42" y2="58" /></g>`;
  }

  // Distortion / Fun
  if (cat === 'distortion' || id.includes('glitch') || id.includes('pixel') || id.includes('warp')) {
    if (id.includes('glitch')) {
      return `<rect x="18" y="26" width="34" height="6" fill="#06b6d4" /><rect x="28" y="36" width="34" height="6" fill="#ec4899" /><rect x="22" y="46" width="36" height="6" fill="#eab308" />`;
    }
    if (id.includes('mirror') || id.includes('kaleidoscope')) {
      return `<polygon points="40,20 60,54 40,48" fill="#a78bfa" /><polygon points="40,20 20,54 40,48" fill="#818cf8" /><line x1="40" y1="16" x2="40" y2="62" stroke="#fff" stroke-width="2" stroke-dasharray="3,3" />`;
    }
    return `<circle cx="30" cy="36" r="12" fill="#14b8a6" /><circle cx="50" cy="36" r="12" fill="#14b8a6" /><ellipse cx="40" cy="54" rx="14" ry="6" fill="#0f766e" />`;
  }

  // Cinematic / Retro Film
  if (cat === 'cinematic' || cat === 'retro') {
    return `<rect x="18" y="24" width="44" height="32" rx="4" fill="#09090b" stroke="#cbd5e1" stroke-width="2" /><rect x="24" y="28" width="6" height="5" fill="#f8fafc" /><rect x="37" y="28" width="6" height="5" fill="#f8fafc" /><rect x="50" y="28" width="6" height="5" fill="#f8fafc" /><rect x="24" y="47" width="6" height="5" fill="#f8fafc" /><rect x="37" y="47" width="6" height="5" fill="#f8fafc" /><rect x="50" y="47" width="6" height="5" fill="#f8fafc" />`;
  }

  // Beauty & Skin
  if (cat === 'beauty') {
    return `<circle cx="40" cy="38" r="16" fill="none" stroke="#f43f5e" stroke-width="3" /><path d="M40 18 Q 42 26, 50 26 Q 42 26, 40 34 Q 38 26, 30 26 Q 38 26, 40 18 Z" fill="#fb7185" /><circle cx="40" cy="38" r="8" fill="#fda4af" opacity="0.6" />`;
  }

  // Aesthetic
  return `<circle cx="32" cy="36" r="12" fill="#fbbf24" opacity="0.8" /><circle cx="48" cy="44" r="14" fill="#f43f5e" opacity="0.7" />`;
}

// Map each filter to unique gradients or color accents
function getFilterGradient(filter: FilterDefinition): { g1: string; g2: string; angle: number } {
  const cat = filter.category;
  const id = filter.id;

  // Beauty: soft peachy, radiant pinks, dewy creams
  if (cat === 'beauty') {
    if (id.includes('warm') || id.includes('golden')) return { g1: '#fed7aa', g2: '#fb923c', angle: 45 };
    if (id.includes('cool')) return { g1: '#fbcfe8', g2: '#c084fc', angle: 135 };
    if (id.includes('rose') || id.includes('peach')) return { g1: '#fda4af', g2: '#f43f5e', angle: 60 };
    return { g1: '#ffe4e6', g2: '#f43f5e', angle: 45 };
  }

  // Aesthetic: curated pastels & modern color tones
  if (cat === 'aesthetic') {
    if (id.includes('warm') || id.includes('beige')) return { g1: '#fef3c7', g2: '#d97706', angle: 45 };
    if (id.includes('cool') || id.includes('blue')) return { g1: '#e0f2fe', g2: '#0284c7', angle: 60 };
    if (id.includes('pink') || id.includes('rose')) return { g1: '#fce7f3', g2: '#db2777', angle: 45 };
    if (id.includes('lavender')) return { g1: '#ede9fe', g2: '#7c3aed', angle: 90 };
    if (id.includes('green')) return { g1: '#dcfce7', g2: '#16a34a', angle: 120 };
    return { g1: '#fef08a', g2: '#e11d48', angle: 45 };
  }

  // Cinematic: moody teals, deep ambers, dark contrast
  if (cat === 'cinematic') {
    if (id.includes('teal-orange')) return { g1: '#0d9488', g2: '#ea580c', angle: 45 };
    if (id.includes('noir') || id.includes('silver')) return { g1: '#64748b', g2: '#0f172a', angle: 90 };
    if (id.includes('blue-hour')) return { g1: '#1e3a8a', g2: '#3b82f6', angle: 120 };
    if (id.includes('golden')) return { g1: '#b45309', g2: '#1e293b', angle: 45 };
    return { g1: '#334155', g2: '#020617', angle: 45 };
  }

  // Retro: sepia, vintage faded, 90s Polaroid
  if (cat === 'retro') {
    if (id.includes('sepia') || id.includes('brown')) return { g1: '#d97706', g2: '#78350f', angle: 45 };
    if (id.includes('polaroid') || id.includes('90s')) return { g1: '#fef08a', g2: '#0284c7', angle: 135 };
    if (id.includes('vhs') || id.includes('y2k')) return { g1: '#f43f5e', g2: '#06b6d4', angle: 60 };
    return { g1: '#fed7aa', g2: '#b45309', angle: 45 };
  }

  // Fantasy: vibrant neon, auras, cosmic purples
  if (cat === 'fantasy') {
    if (id.includes('fire')) return { g1: '#f97316', g2: '#dc2626', angle: 45 };
    if (id.includes('ice')) return { g1: '#67e8f9', g2: '#0284c7', angle: 90 };
    if (id.includes('galaxy') || id.includes('cosmic')) return { g1: '#7e22ce', g2: '#1e1b4b', angle: 135 };
    return { g1: '#a855f7', g2: '#ec4899', angle: 45 };
  }

  // Light: warm sun, prism, auroras
  if (cat === 'light') {
    if (id.includes('sunset') || id.includes('candle')) return { g1: '#fb923c', g2: '#be123c', angle: 45 };
    if (id.includes('aurora')) return { g1: '#22c55e', g2: '#a855f7', angle: 90 };
    if (id.includes('prism') || id.includes('rainbow')) return { g1: '#38bdf8', g2: '#ec4899', angle: 120 };
    return { g1: '#fde047', g2: '#f97316', angle: 45 };
  }

  // Nature
  if (cat === 'nature') {
    if (id.includes('snow') || id.includes('frost')) return { g1: '#bae6fd', g2: '#0284c7', angle: 45 };
    if (id.includes('autumn') || id.includes('leaves')) return { g1: '#f59e0b', g2: '#b45309', angle: 60 };
    if (id.includes('rain') || id.includes('ocean')) return { g1: '#38bdf8', g2: '#1d4ed8', angle: 90 };
    return { g1: '#4ade80', g2: '#15803d', angle: 45 };
  }

  // Distortion
  if (cat === 'distortion') {
    return { g1: '#06b6d4', g2: '#7c3aed', angle: 60 };
  }

  // Default fallback
  const base = CATEGORY_COLORS[cat] || { bg1: '#64748b', bg2: '#334155', accent: '#38bdf8' };
  return { g1: base.bg1, g2: base.bg2, angle: 45 };
}

/**
 * Returns an optimized SVG data URI for any given FilterDefinition.
 * Produces crisp, beautiful thumbnails matching modern camera apps.
 */
export function getFilterThumbnail(filter: FilterDefinition): string {
  const { g1, g2, angle } = getFilterGradient(filter);
  const iconMarkup = getIconForFilter(filter);
  const initials = filter.name.split(' ').map(w => w[0]).slice(0, 2).join('');

  // Circular social thumbnail with rich gradient, glass border, center icon, and badge
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle})">
      <stop offset="0%" stop-color="${g1}" />
      <stop offset="100%" stop-color="${g2}" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Circular background -->
  <circle cx="40" cy="40" r="37" fill="url(#bg)" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
  
  <!-- Subtle inner lens reflection -->
  <ellipse cx="32" cy="22" rx="18" ry="8" fill="#ffffff" opacity="0.18" />

  <!-- Center dynamic visual icon -->
  <g filter="url(#shadow)">
    ${iconMarkup}
  </g>

  <!-- Subtle category initials label at bottom -->
  <rect x="20" y="62" width="40" height="13" rx="6.5" fill="rgba(0,0,0,0.4)" />
  <text x="40" y="71" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">${initials}</text>
</svg>
`.trim().replace(/\n\s+/g, ' ');

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
