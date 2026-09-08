import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Creates the exact launcher icon SVG matching the uploaded image:
 * Deep Navy Squircle / Background (#002A66 to #001E4D / #002B66)
 * White Bold "Auto"
 * Light Azure Blue Bold "Parts" (#1E88E5 / #1976D2 / #2196F3)
 * Orange "INDIA" with speed arrows (#FF6600 / #FF7700)
 */
function createLauncherIconSvg(size = 512, withBg = true, borderRadius = 110) {
  return `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#002D6E"/>
      <stop offset="100%" stop-color="#001C45"/>
    </linearGradient>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@1,900&amp;family=Poppins:wght@800;900&amp;display=swap');
      .icon-auto {
        font-family: 'Montserrat', 'Poppins', -apple-system, sans-serif;
        font-weight: 900;
        font-style: italic;
        font-size: 135px;
        letter-spacing: -3px;
        fill: #FFFFFF;
      }
      .icon-parts {
        font-family: 'Montserrat', 'Poppins', -apple-system, sans-serif;
        font-weight: 900;
        font-style: italic;
        font-size: 135px;
        letter-spacing: -3px;
        fill: #1E88E5;
      }
      .icon-india {
        font-family: 'Montserrat', 'Poppins', -apple-system, sans-serif;
        font-weight: 900;
        font-size: 32px;
        letter-spacing: 12px;
        fill: #FF6600;
      }
    </style>
  </defs>

  ${withBg ? `<rect width="512" height="512" rx="${borderRadius}" fill="url(#bgGrad)"/>` : ''}

  <g transform="translate(0, 40)">
    <!-- "Auto" Text -->
    <text x="256" y="195" text-anchor="middle" class="icon-auto">Auto</text>
    
    <!-- "Parts" Text -->
    <text x="256" y="300" text-anchor="middle" class="icon-parts">Parts</text>
    
    <!-- Speed line Left -->
    <polygon points="56,325 155,325 155,333 56,325" fill="#FF6600" />
    
    <!-- "INDIA" Center Text -->
    <text x="262" y="337" text-anchor="middle" class="icon-india">INDIA</text>
    
    <!-- Speed line Right -->
    <polygon points="357,333 357,325 456,325 357,333" fill="#FF6600" />
  </g>
</svg>
`;
}

async function buildAllAndroidLauncherIcons() {
  const baseRN = path.join(process.cwd(), 'react-native-app', 'android', 'app', 'src', 'main', 'res');

  const densities = [
    { dir: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
  ];

  const fullSvg = createLauncherIconSvg(512, true, 110);
  const roundSvg = createLauncherIconSvg(512, true, 256); // perfectly round
  const fgSvg = createLauncherIconSvg(512, false, 0); // transparent foreground for adaptive icon

  const fullBuffer = Buffer.from(fullSvg);
  const roundBuffer = Buffer.from(roundSvg);
  const fgBuffer = Buffer.from(fgSvg);

  for (const { dir, iconSize, fgSize } of densities) {
    const targetDir = path.join(baseRN, dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. ic_launcher.png (standard squircle/square)
    await sharp(fullBuffer)
      .resize(iconSize, iconSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // 2. ic_launcher_round.png (round icon for Android 7.1+)
    await sharp(roundBuffer)
      .resize(iconSize, iconSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // 3. ic_launcher_foreground.png (for Android Adaptive Icons)
    await sharp(fgBuffer)
      .resize(fgSize, fgSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));
    
    console.log(`Generated launcher icons for ${dir}`);
  }

  // Also update standard drawable icon_logo.png in drawable folders if any
  const drawableDensities = [
    { dir: 'drawable-mdpi', size: 48 },
    { dir: 'drawable-hdpi', size: 72 },
    { dir: 'drawable-xhdpi', size: 96 },
    { dir: 'drawable-xxhdpi', size: 144 },
    { dir: 'drawable-xxxhdpi', size: 192 },
    { dir: 'drawable', size: 192 },
  ];

  for (const { dir, size } of drawableDensities) {
    const targetDir = path.join(baseRN, dir);
    if (fs.existsSync(targetDir)) {
      await sharp(fullBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(targetDir, 'icon_logo.png'));
    }
  }

  // Also save a 512x512 Play Store high-res icon in android/app/
  const playStorePath = path.join(process.cwd(), 'react-native-app', 'android', 'app');
  if (fs.existsSync(playStorePath)) {
    await sharp(fullBuffer).resize(512, 512).png().toFile(path.join(playStorePath, 'ic_launcher-playstore.png'));
  }

  console.log('✅ React Native Android launcher icons successfully updated!');
}

buildAllAndroidLauncherIcons().catch(err => {
  console.error('Error generating android launcher icons:', err);
  process.exit(1);
});
