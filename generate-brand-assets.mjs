import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// ─────────────────────────────────────────────────────────────────────────────
// OFFICIAL DATAVERSE BRAND ASSETS GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

// High-resolution 512x512 Master App Icon SVG
// Design: Sleek obsidian rounded squircle with fine aurora border,
// containing the iconic interlocking DataVerse D-V monogram in Aurora Teal & Cyan.
const appIconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient: Deep Obsidian with subtle radial glow -->
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#0a262d" />
      <stop offset="60%" stop-color="#051519" />
      <stop offset="100%" stop-color="#03090b" />
    </radialGradient>

    <!-- Border Gradient -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5eead4" stop-opacity="0.45" />
      <stop offset="50%" stop-color="#0d9488" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#2dd4bf" stop-opacity="0.35" />
    </linearGradient>

    <!-- Primary 'D' Loop Gradient: Deep Teal to Vibrant Aurora -->
    <linearGradient id="dGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5eead4" />
      <stop offset="35%" stop-color="#2dd4bf" />
      <stop offset="85%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#0f766e" />
    </linearGradient>

    <!-- 'V' Chevron Gradient: Vibrant Cyan through Aurora Teal -->
    <linearGradient id="vGrad" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#14b8a6" />
    </linearGradient>

    <!-- Inner Ambient Glow Filter -->
    <filter id="bloomGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <!-- Subtle Drop Shadow -->
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.65" />
    </filter>
  </defs>

  <!-- Background Squircle Container with safe padding for circular clipping -->
  <rect x="20" y="20" width="472" height="472" rx="108" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="4.5" filter="url(#cardShadow)" />

  <!-- Subtle Radial Backlight behind Monogram -->
  <circle cx="256" cy="256" r="130" fill="#2dd4bf" opacity="0.12" filter="blur(28px)" />

  <!-- The Interlocking DataVerse D-V Monogram -->
  <g id="monogram">
    <!-- 'D' Outer Track: Smooth rounded loop -->
    <path d="M152 148 H254 C322 148 368 192 368 256 C368 320 322 364 254 364 H152 V148 Z" 
          fill="none" 
          stroke="url(#dGrad)" 
          stroke-width="38" 
          stroke-linecap="round" 
          stroke-linejoin="round" />

    <!-- 'V' Dynamic Chevron intersecting the D loop with light bloom -->
    <path d="M228 208 L284 324 L380 178" 
          fill="none" 
          stroke="url(#vGrad)" 
          stroke-width="36" 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          filter="url(#bloomGlow)" />

    <!-- Nexus Centerpoint Spark -->
    <circle cx="284" cy="324" r="10" fill="#ffffff" opacity="0.95" />
    <circle cx="284" cy="324" r="18" fill="#5eead4" opacity="0.4" />
  </g>
</svg>`;

// Scalable Favicon SVG (simplified & optimized for 16-64px)
const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <radialGradient id="favBg" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#0a262d" />
      <stop offset="100%" stop-color="#03090b" />
    </radialGradient>
    <linearGradient id="favGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5eead4" />
      <stop offset="50%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="15" fill="url(#favBg)" stroke="#2dd4bf" stroke-opacity="0.35" stroke-width="1.5" />
  <path d="M19 18 H32 C41 18 47 24 47 32 C47 40 41 46 32 46 H19 V18 Z" 
        fill="none" stroke="url(#favGrad)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M29 26 L36 41 L47 22" 
        fill="none" stroke="#2dd4bf" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="36" cy="41" r="2" fill="#ffffff" />
</svg>`;

// Social Share Open Graph Banner (1200x630)
// High-impact card for Twitter, Facebook, Discord, Slack, TestMyBuild, etc.
const ogBannerSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <radialGradient id="ogBg" cx="50%" cy="45%" r="75%">
      <stop offset="0%" stop-color="#072228" />
      <stop offset="45%" stop-color="#041216" />
      <stop offset="100%" stop-color="#020608" />
    </radialGradient>
    <linearGradient id="ogDGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5eead4" />
      <stop offset="40%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>
    <linearGradient id="ogVGrad" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#14b8a6" />
    </linearGradient>
    <filter id="ogGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#ogBg)" />

  <!-- Subtle ambient glow spheres -->
  <circle cx="600" cy="240" r="220" fill="#2dd4bf" opacity="0.14" filter="blur(60px)" />
  <circle cx="300" cy="180" r="160" fill="#0d9488" opacity="0.08" filter="blur(50px)" />
  <circle cx="900" cy="380" r="180" fill="#38bdf8" opacity="0.08" filter="blur(50px)" />

  <!-- Subtle tech border ring -->
  <rect x="32" y="32" width="1136" height="566" rx="28" fill="none" stroke="#2dd4bf" stroke-opacity="0.18" stroke-width="1.5" />

  <!-- Central DataVerse App Icon (220x220) -->
  <g transform="translate(490, 80)">
    <rect width="220" height="220" rx="52" fill="#051519" stroke="#2dd4bf" stroke-opacity="0.4" stroke-width="3" />
    <g transform="translate(110, 110) scale(0.48) translate(-256, -256)">
      <path d="M152 148 H254 C322 148 368 192 368 256 C368 320 322 364 254 364 H152 V148 Z" 
            fill="none" stroke="url(#ogDGrad)" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M228 208 L284 324 L380 178" 
            fill="none" stroke="url(#ogVGrad)" stroke-width="38" stroke-linecap="round" stroke-linejoin="round" filter="url(#ogGlow)" />
      <circle cx="284" cy="324" r="12" fill="#ffffff" />
    </g>
  </g>

  <!-- Title: DataVerse -->
  <text x="600" y="380" text-anchor="middle" font-family="'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="54" letter-spacing="-1">
    <tspan fill="#ffffff">Data</tspan><tspan fill="#2dd4bf">Verse</tspan>
  </text>

  <!-- Tagline -->
  <text x="600" y="428" text-anchor="middle" font-family="'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="500" font-size="22" fill="#94a3b8" letter-spacing="0.5">
    Next-Gen Social Network • Connect, Share &amp; Chat in Real Time
  </text>

  <!-- Feature Badges -->
  <g transform="translate(600, 480)">
    <text text-anchor="middle" font-family="'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="15" fill="#2dd4bf" letter-spacing="1.5">
      REAL-TIME MESSAGING  •  CREATOR REELS  •  SECURE VAULT
    </text>
  </g>

  <!-- Footer Domain Pill -->
  <g transform="translate(470, 524)">
    <rect width="260" height="36" rx="18" fill="#0f262c" stroke="#2dd4bf" stroke-opacity="0.3" stroke-width="1" />
    <text x="130" y="24" text-anchor="middle" font-family="'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="14" fill="#e2e8f0" letter-spacing="0.4">
      dataverse.datalexcloud.tech
    </text>
  </g>
</svg>`;

async function main() {
  const publicDir = path.resolve('frontend/public');

  console.log('🎨 Generating DataVerse Brand Assets...');

  // 1. Write SVGs
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), appIconSvg, 'utf8');
  console.log('✓ Wrote favicon.svg and logo.svg');

  // 2. Generate logo.png (512x512 Master App Icon)
  const logo512Buf = await sharp(Buffer.from(appIconSvg))
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'logo.png'), logo512Buf);
  console.log('✓ Generated 512x512 logo.png (' + logo512Buf.length + ' bytes)');

  // 3. Generate apple-touch-icon.png (180x180)
  const appleTouchBuf = await sharp(Buffer.from(appIconSvg))
    .resize(180, 180)
    .png({ quality: 100 })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchBuf);
  console.log('✓ Generated 180x180 apple-touch-icon.png');

  // 4. Generate og-image.png (1200x630 Social Card)
  const ogImageBuf = await sharp(Buffer.from(ogBannerSvg))
    .resize(1200, 630)
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'og-image.png'), ogImageBuf);
  console.log('✓ Generated 1200x630 og-image.png (' + ogImageBuf.length + ' bytes)');

  // 5. Generate Web App Manifest (manifest.json)
  const manifest = {
    short_name: "DataVerse",
    name: "DataVerse — Social Network by Datalex",
    icons: [
      {
        src: "/favicon.svg",
        type: "image/svg+xml",
        sizes: "any"
      },
      {
        src: "/apple-touch-icon.png",
        type: "image/png",
        sizes: "180x180"
      },
      {
        src: "/logo.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "any maskable"
      }
    ],
    start_url: "/",
    background_color: "#040b0d",
    theme_color: "#040b0d",
    display: "standalone",
    orientation: "portrait",
    description: "Connect, share photos and videos, chat in real time, and explore vibrant creators on DataVerse."
  };
  fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('✓ Generated manifest.json');

  console.log('🎉 Brand assets generated successfully!');
}

main().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});

