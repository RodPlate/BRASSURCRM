import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const iconsDir = path.join(root, 'public', 'icons');
const source = path.join(root, 'public', 'pwa-source.svg');

const sizes = [72, 96, 128, 180, 192, 512];

await mkdir(iconsDir, { recursive: true });

for (const size of sizes) {
  await sharp(source)
    .resize(size, size)
    .png()
    .toFile(path.join(iconsDir, `icon-${size}.png`));
}

await sharp(source)
  .resize(180, 180)
  .png()
  .toFile(path.join(iconsDir, 'apple-touch-icon.png'));

await sharp(source)
  .resize(512, 512)
  .extend({
    top: 64,
    bottom: 64,
    left: 64,
    right: 64,
    background: { r: 15, g: 23, b: 42, alpha: 1 },
  })
  .png()
  .toFile(path.join(iconsDir, 'icon-maskable-512.png'));

console.log('PWA icons generated in public/icons/ (incl. apple-touch-icon.png)');
