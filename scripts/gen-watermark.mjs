import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../apps/web/public/shoptool-watermark.png');

const DARK = '#2B2B2E';
const ORANGE = '#FF6A1A';
const GREY = '#8A8A95';

// Clean SHOPTOOL.mn wordmark with the logo's orange corner brackets, on
// transparent background — used as the standard product-image watermark.
const svg = `
<svg width="760" height="170" viewBox="0 0 760 170" xmlns="http://www.w3.org/2000/svg">
  <!-- left bracket -->
  <path d="M 60 40 H 30 V 130 H 60" fill="none" stroke="${ORANGE}" stroke-width="12" stroke-linecap="square"/>
  <!-- right bracket -->
  <path d="M 700 40 H 730 V 130 H 700" fill="none" stroke="${ORANGE}" stroke-width="12" stroke-linecap="square"/>
  <!-- wordmark -->
  <text x="380" y="108" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-weight="800" font-style="italic" font-size="92" letter-spacing="1">
    <tspan fill="${DARK}">SHOP</tspan><tspan fill="${ORANGE}">TOOL</tspan><tspan fill="${GREY}" font-size="46" font-style="normal">.mn</tspan>
  </text>
  <!-- tagline -->
  <text x="380" y="146" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-weight="600" font-size="20" letter-spacing="3" fill="${DARK}" opacity="0.85">БАРИЛГЫН МАТЕРИАЛ</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log('Wrote', OUT);
