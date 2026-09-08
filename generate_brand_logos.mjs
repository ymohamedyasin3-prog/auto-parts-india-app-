import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// SVG for dark background (Splash screen / Dark mode)
// "Auto" in Pure White #FFFFFF, "Parts" in Navy #0D3E74, "INDIA" in Orange #FF6600 with speed lines
const createLogoSvg = ({ autoColor = '#FFFFFF', partsColor = '#0B3B70', indiaColor = '#FF6A00', width = 1200, height = 500, withBg = false, bgColor = '#000000' }) => `
<svg width="${width}" height="${height}" viewBox="0 0 1200 500" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${withBg ? `<rect width="1200" height="500" fill="${bgColor}"/>` : ''}
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@1,900&amp;family=Poppins:wght@800;900&amp;display=swap');
      .logo-auto {
        font-family: 'Montserrat', 'Poppins', -apple-system, sans-serif;
        font-weight: 900;
        font-style: italic;
        font-size: 210px;
        fill: ${autoColor};
      }
      .logo-parts {
        font-family: 'Montserrat', 'Poppins', -apple-system, sans-serif;
        font-weight: 900;
        font-style: italic;
        font-size: 210px;
        fill: ${partsColor};
      }
      .logo-india {
        font-family: 'Montserrat', 'Poppins', -apple-system, sans-serif;
        font-weight: 900;
        font-size: 54px;
        letter-spacing: 24px;
        fill: ${indiaColor};
      }
    </style>
  </defs>

  <g transform="translate(60, 260)">
    <!-- "Auto" Text -->
    <text x="30" y="0" class="logo-auto">Auto</text>
    
    <!-- "Parts" Text -->
    <text x="510" y="0" class="logo-parts">Parts</text>
    
    <!-- Speed line Left -->
    <polygon points="120,80 340,80 340,92 120,80" fill="${indiaColor}" />
    
    <!-- "INDIA" Center Text -->
    <text x="580" y="94" text-anchor="middle" class="logo-india">INDIA</text>
    
    <!-- Speed line Right -->
    <polygon points="800,92 800,80 1020,80 800,92" fill="${indiaColor}" />
  </g>
</svg>
`;

async function generateAssets() {
  const publicAssetsDir = path.join(process.cwd(), 'public', 'assets');
  const rnAssetsDir = path.join(process.cwd(), 'react-native-app', 'src', 'assets');

  if (!fs.existsSync(publicAssetsDir)) fs.mkdirSync(publicAssetsDir, { recursive: true });
  if (!fs.existsSync(rnAssetsDir)) fs.mkdirSync(rnAssetsDir, { recursive: true });

  // 1. Transparent Dark Text for Light backgrounds (Navy + Dark Gray + Orange)
  const lightBgSvg = createLogoSvg({ autoColor: '#0F172A', partsColor: '#0A3B73', indiaColor: '#FF6A00' });
  // 2. Transparent Light Text for Dark/Splash backgrounds (White + Deep Navy/Royal + Orange)
  const darkBgSvg = createLogoSvg({ autoColor: '#FFFFFF', partsColor: '#0B478A', indiaColor: '#FF6A00' });
  // 3. Black Background version
  const blackBgSvg = createLogoSvg({ autoColor: '#FFFFFF', partsColor: '#0B478A', indiaColor: '#FF6A00', withBg: true, bgColor: '#0B0F19' });
  // 4. Blue Background version (matching splash / app theme)
  const blueBgSvg = createLogoSvg({ autoColor: '#FFFFFF', partsColor: '#05234A', indiaColor: '#FF9900', withBg: true, bgColor: '#0066FF' });

  // Render PNGs
  const darkBgBuffer = Buffer.from(darkBgSvg);
  const lightBgBuffer = Buffer.from(lightBgSvg);
  const blackBgBuffer = Buffer.from(blackBgSvg);

  await sharp(darkBgBuffer).png().toFile(path.join(publicAssetsDir, 'logo.png'));
  await sharp(darkBgBuffer).png().toFile(path.join(publicAssetsDir, 'splash_logo.png'));
  await sharp(lightBgBuffer).png().toFile(path.join(publicAssetsDir, 'logo_dark.png'));
  await sharp(lightBgBuffer).png().toFile(path.join(publicAssetsDir, 'auth_logo.png'));
  await sharp(darkBgBuffer).png().toFile(path.join(rnAssetsDir, 'logo.png'));
  await sharp(darkBgBuffer).png().toFile(path.join(rnAssetsDir, 'logo_transparent.png'));
  await sharp(lightBgBuffer).png().toFile(path.join(rnAssetsDir, 'logo_optimized.png'));

  // Save SVGs for razor-sharp rendering
  fs.writeFileSync(path.join(publicAssetsDir, 'logo.svg'), darkBgSvg);
  fs.writeFileSync(path.join(publicAssetsDir, 'logo_light_bg.svg'), lightBgSvg);

  console.log('All brand logo assets successfully generated!');
}

generateAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
