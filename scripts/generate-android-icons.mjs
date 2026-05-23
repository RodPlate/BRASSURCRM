/**
 * Genera iconos Android desde public/icons/icon-512.png (logo Brassur).
 * Ejecutar tras `npx cap add android`: npm run cap:icons
 */
import sharp from 'sharp';
import { mkdir, copyFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const source = path.join(root, 'public', 'icons', 'icon-512.png');
const resDir = path.join(root, 'android', 'app', 'src', 'main', 'res');

const densities = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const adaptiveForeground = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

async function writeLauncher(folder, size) {
  const dir = path.join(resDir, folder);
  await mkdir(dir, { recursive: true });
  const buf = await sharp(source)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
  await sharp(buf).toFile(path.join(dir, 'ic_launcher.png'));
  await sharp(buf).toFile(path.join(dir, 'ic_launcher_round.png'));
}

async function writeForeground(folder, size) {
  const dir = path.join(resDir, folder);
  await mkdir(dir, { recursive: true });
  await sharp(source)
    .resize(Math.round(size * 0.65), Math.round(size * 0.65), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: Math.round(size * 0.175),
      bottom: Math.round(size * 0.175),
      left: Math.round(size * 0.175),
      right: Math.round(size * 0.175),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(size, size)
    .png()
    .toFile(path.join(dir, 'ic_launcher_foreground.png'));
}

const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;

async function main() {
  for (const [folder, size] of Object.entries(densities)) {
    await writeLauncher(folder, size);
  }
  for (const [folder, size] of Object.entries(adaptiveForeground)) {
    await writeForeground(folder, size);
  }

  const anydpi = path.join(resDir, 'mipmap-anydpi-v26');
  await mkdir(anydpi, { recursive: true });
  await writeFile(path.join(anydpi, 'ic_launcher.xml'), adaptiveXml);
  await writeFile(path.join(anydpi, 'ic_launcher_round.xml'), adaptiveXml);

  const valuesDir = path.join(resDir, 'values');
  await mkdir(valuesDir, { recursive: true });
  const colorsPath = path.join(valuesDir, 'ic_launcher_background.xml');
  const colors = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFFFFF</color>
</resources>
`;
  await writeFile(colorsPath, colors);

  console.log('Iconos Android generados en android/app/src/main/res/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
