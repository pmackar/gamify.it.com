const sharp = require('sharp');
const path = require('path');

const sizes = [192, 512];
const publicDir = path.join(__dirname, '..', 'public');

// Create a simple "G" icon with gradient background
async function generateIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a2e"/>
          <stop offset="100%" style="stop-color:#0a0a0a"/>
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ff6b6b"/>
          <stop offset="50%" style="stop-color:#ffd700"/>
          <stop offset="100%" style="stop-color:#5fbf8a"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
      <text
        x="50%"
        y="55%"
        font-family="Arial Black, Arial, sans-serif"
        font-size="${size * 0.55}"
        font-weight="900"
        fill="url(#accent)"
        text-anchor="middle"
        dominant-baseline="middle"
      >G</text>
    </svg>
  `;

  const outputPath = path.join(publicDir, `icon-${size}.png`);

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  console.log(`Generated: icon-${size}.png`);
}

async function main() {
  for (const size of sizes) {
    await generateIcon(size);
  }

  // Also generate apple-touch-icon (180x180)
  const appleSize = 180;
  const svg = `
    <svg width="${appleSize}" height="${appleSize}" viewBox="0 0 ${appleSize} ${appleSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a2e"/>
          <stop offset="100%" style="stop-color:#0a0a0a"/>
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ff6b6b"/>
          <stop offset="50%" style="stop-color:#ffd700"/>
          <stop offset="100%" style="stop-color:#5fbf8a"/>
        </linearGradient>
      </defs>
      <rect width="${appleSize}" height="${appleSize}" fill="url(#bg)"/>
      <text
        x="50%"
        y="55%"
        font-family="Arial Black, Arial, sans-serif"
        font-size="${appleSize * 0.55}"
        font-weight="900"
        fill="url(#accent)"
        text-anchor="middle"
        dominant-baseline="middle"
      >G</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('Generated: apple-touch-icon.png');
  console.log('Done!');
}

main().catch(console.error);
