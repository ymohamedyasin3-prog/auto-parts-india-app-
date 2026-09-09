import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateAll() {
  const sourceFile = '/tmp/downloaded_logo';
  if (!fs.existsSync(sourceFile)) {
    throw new Error('Downloaded logo not found at ' + sourceFile);
  }

  // 1. Process trimmed logo with balanced optical padding
  const rawTrimmed = await sharp(sourceFile).trim().toBuffer();
  const trimMeta = await sharp(rawTrimmed).metadata();
  console.log('Trimmed dimensions:', trimMeta.width, 'x', trimMeta.height);

  const padY = Math.round((trimMeta.height || 850) * 0.05);
  const padX = Math.round((trimMeta.width || 1182) * 0.05);

  const centeredLogoBuf = await sharp(rawTrimmed)
    .extend({
      top: padY,
      bottom: padY,
      left: padX,
      right: padX,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const centeredMeta = await sharp(centeredLogoBuf).metadata();
  console.log('Centered logo dimensions:', centeredMeta.width, 'x', centeredMeta.height);

  // 2. Square version (1:1 aspect ratio with logo centered)
  const maxDim = Math.max(centeredMeta.width || 1000, centeredMeta.height || 1000);
  const squareDim = Math.round(maxDim * 1.12);
  const squareLogoBuf = await sharp({
    create: {
      width: squareDim,
      height: squareDim,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: centeredLogoBuf, gravity: 'center' }])
    .png()
    .toBuffer();

  console.log('Square logo dimension:', squareDim, 'x', squareDim);

  // 3. Save to React Native assets & public assets
  const assetTargets = [
    'react-native-app/src/assets/app_logo.png',
    'react-native-app/src/assets/logo.png',
    'public/assets/app_logo.png',
    'public/assets/logo.png',
    'dist/assets/app_logo.png',
    'dist/assets/logo.png',
  ];

  for (const t of assetTargets) {
    const dir = path.dirname(t);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await sharp(centeredLogoBuf).png().toFile(t);
    console.log('Wrote', t);
  }

  const squareTargets = [
    'react-native-app/src/assets/logo_square.png',
    'public/assets/logo_square.png',
    'dist/assets/logo_square.png',
  ];

  for (const t of squareTargets) {
    const dir = path.dirname(t);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await sharp(squareLogoBuf).png().toFile(t);
    console.log('Wrote', t);
  }

  // Also write react-native-app/android/app/src/main/res/drawable-mdpi/src_assets_app_logo.png
  const rnBundledDrawable =
    'react-native-app/android/app/src/main/res/drawable-mdpi/src_assets_app_logo.png';
  if (fs.existsSync(path.dirname(rnBundledDrawable))) {
    await sharp(centeredLogoBuf).png().toFile(rnBundledDrawable);
    console.log('Wrote', rnBundledDrawable);
  }

  // 4. Splash screen logo densities
  const aspect = (centeredMeta.height || 850) / (centeredMeta.width || 1182);
  const splashDensities = [
    { dir: 'drawable', width: 400, height: Math.round(400 * aspect) },
    { dir: 'drawable-mdpi', width: 200, height: Math.round(200 * aspect) },
    { dir: 'drawable-hdpi', width: 300, height: Math.round(300 * aspect) },
    { dir: 'drawable-xhdpi', width: 400, height: Math.round(400 * aspect) },
    { dir: 'drawable-xxhdpi', width: 600, height: Math.round(600 * aspect) },
    { dir: 'drawable-xxxhdpi', width: 800, height: Math.round(800 * aspect) },
  ];

  const resBases = [
    'react-native-app/android/app/src/main/res',
    'android/app/src/main/res',
  ];

  for (const base of resBases) {
    if (!fs.existsSync(base)) continue;
    for (const { dir, width, height } of splashDensities) {
      const targetDir = path.join(base, dir);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      await sharp(centeredLogoBuf)
        .resize(width, height)
        .png()
        .toFile(path.join(targetDir, 'splash_logo.png'));
      console.log('Wrote splash_logo.png in', path.join(base, dir));
    }
  }

  // 5. Launcher icons (Squircle, Round, Foreground)
  const bgSvg = (radius) => Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#002D6E"/>
          <stop offset="100%" stop-color="#001C45"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="${radius}" fill="url(#grad)"/>
    </svg>
  `);

  // Fit logo within safe zone for 512x512
  const fgLogoBuf = await sharp(centeredLogoBuf)
    .resize(360, 260, { fit: 'inside' })
    .toBuffer();

  const squircleIcon512 = await sharp(bgSvg(110))
    .composite([{ input: fgLogoBuf, gravity: 'center' }])
    .png()
    .toBuffer();

  const roundIcon512 = await sharp(bgSvg(256))
    .composite([{ input: fgLogoBuf, gravity: 'center' }])
    .png()
    .toBuffer();

  const fgIcon512 = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fgLogoBuf, gravity: 'center' }])
    .png()
    .toBuffer();

  const iconDensities = [
    { dir: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
  ];

  for (const base of resBases) {
    if (!fs.existsSync(base)) continue;
    for (const { dir, iconSize, fgSize } of iconDensities) {
      const targetDir = path.join(base, dir);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      await sharp(squircleIcon512)
        .resize(iconSize, iconSize)
        .png()
        .toFile(path.join(targetDir, 'ic_launcher.png'));
      await sharp(roundIcon512)
        .resize(iconSize, iconSize)
        .png()
        .toFile(path.join(targetDir, 'ic_launcher_round.png'));
      await sharp(fgIcon512)
        .resize(fgSize, fgSize)
        .png()
        .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));
      console.log('Wrote launcher icons in', path.join(base, dir));
    }

    // Playstore 512x512
    const playStoreDir = path.dirname(base);
    if (fs.existsSync(playStoreDir)) {
      await sharp(squircleIcon512).toFile(
        path.join(playStoreDir, 'ic_launcher-playstore.png')
      );
      console.log('Wrote ic_launcher-playstore.png in', playStoreDir);
    }
  }

  // 6. Web & PWA icons
  const pwaTargets = [
    { file: 'public/app-icon.png', size: 512 },
    { file: 'public/icon-512.png', size: 512 },
    { file: 'public/icon-192.png', size: 192 },
    { file: 'public/adaptive-icon.png', size: 512 },
    { file: 'public/favicon.png', size: 64 },
    { file: 'dist/app-icon.png', size: 512 },
    { file: 'dist/icon-512.png', size: 512 },
    { file: 'dist/icon-192.png', size: 192 },
    { file: 'dist/adaptive-icon.png', size: 512 },
    { file: 'dist/favicon.png', size: 64 },
  ];

  for (const { file, size } of pwaTargets) {
    const dir = path.dirname(file);
    if (fs.existsSync(dir)) {
      await sharp(squircleIcon512).resize(size, size).png().toFile(file);
      console.log('Wrote PWA icon', file);
    }
  }

  console.log('✅ ALL ICONS AND LOGOS GENERATED SUCCESSFULLY!');
}

generateAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
