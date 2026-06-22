import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../apps/mobile-customer/assets');

const ORANGE = '#FF7A1A';
const WHITE = '#F4F4F7';
const GREY = '#9A9AA8';

// ─── App icon 512×512 (full-bleed, dark, stacked wordmark + bracket) ───
const iconSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#12121C"/>
      <stop offset="1" stop-color="#08080E"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.6">
      <stop offset="0" stop-color="${ORANGE}" stop-opacity="0.20"/>
      <stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#glow)"/>

  <!-- stacked wordmark -->
  <text x="256" y="232" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-weight="800" font-size="118" letter-spacing="2" fill="${WHITE}">SHOP</text>
  <text x="256" y="350" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-weight="800" font-size="118" letter-spacing="2" fill="${ORANGE}">TOOL</text>

  <!-- orange corner bracket accent (bottom-right, echoes logo) -->
  <path d="M 372 392 H 432 V 452" fill="none" stroke="${ORANGE}" stroke-width="16"
        stroke-linecap="square"/>
  <!-- left tick accent -->
  <rect x="80" y="404" width="60" height="14" rx="4" fill="${GREY}" opacity="0.5"/>
</svg>`;

// ─── Feature graphic 1024×500 ───
const featureSvg = `
<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#14141F"/>
      <stop offset="0.55" stop-color="#0C0C14"/>
      <stop offset="1" stop-color="#08080E"/>
    </linearGradient>
    <radialGradient id="fglow" cx="0.78" cy="0.3" r="0.7">
      <stop offset="0" stop-color="${ORANGE}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#fbg)"/>
  <rect width="1024" height="500" fill="url(#fglow)"/>

  <!-- wordmark -->
  <text x="80" y="250" font-family="Arial, Helvetica, sans-serif" font-weight="800"
        font-size="92" letter-spacing="1" fill="${WHITE}">SHOP<tspan fill="${ORANGE}">TOOL</tspan><tspan fill="${GREY}" font-size="52" dy="-26">.mn</tspan></text>

  <!-- tagline -->
  <text x="84" y="318" font-family="Arial, Helvetica, sans-serif" font-weight="500"
        font-size="34" letter-spacing="1" fill="${GREY}">Барилгын материалын ухаалаг шийдэл</text>

  <!-- sub badges -->
  <text x="84" y="392" font-family="Arial, Helvetica, sans-serif" font-weight="600"
        font-size="26" fill="${WHITE}" opacity="0.85">🛒 Онлайн захиалга&#160;&#160;&#160;🚚 Хурдан хүргэлт&#160;&#160;&#160;💳 QPay</text>

  <!-- big orange bracket on the right (logo motif) -->
  <path d="M 880 120 H 952 V 380" fill="none" stroke="${ORANGE}" stroke-width="22"
        stroke-linecap="square" opacity="0.9"/>
</svg>`;

async function main() {
  await sharp(Buffer.from(iconSvg)).png().toFile(path.join(OUT, 'icon-playstore-512.png'));
  await sharp(Buffer.from(featureSvg)).png().toFile(path.join(OUT, 'feature-graphic-1024x500.png'));
  console.log('Wrote icon-playstore-512.png and feature-graphic-1024x500.png to', OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
