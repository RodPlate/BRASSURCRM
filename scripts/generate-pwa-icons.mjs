import sharp from 'sharp';
import { mkdir, access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const iconsDir = path.join(root, 'public', 'icons');
const logoDir = path.join(root, 'public', 'logo');
const logoPng = path.join(logoDir, 'logo.png');
const logoSvg = path.join(logoDir, 'logo-source.svg');
const legacySvg = path.join(root, 'public', 'pwa-source.svg');

const sizes = [72, 96, 128, 180, 192, 512];
const themeGreen = { r: 5, g: 46, b: 22, alpha: 1 };

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveLogoSource() {
  if (await fileExists(logoPng)) return logoPng;
  if (await fileExists(logoSvg)) return logoSvg;
  if (await fileExists(legacySvg)) return legacySvg;
  throw new Error('No logo found. Add public/logo/logo.png or logo-source.svg');
}

async function ensureMasterLogo(source) {
  await mkdir(logoDir, { recursive: true });
  if (source === logoPng) return logoPng;

  await sharp(source)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toFile(logoPng);

  return logoPng;
}

const source = await resolveLogoSource();
const master = await ensureMasterLogo(source);

await mkdir(iconsDir, { recursive: true });

for (const size of sizes) {
  await sharp(master)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(iconsDir, `icon-${size}.png`));
}

await sharp(master)
  .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .png()
  .toFile(path.join(iconsDir, 'apple-touch-icon.png'));

await sharp(master)
  .resize(400, 400, { fit: 'contain', background: themeGreen })
  .extend({ top: 56, bottom: 56, left: 56, right: 56, background: themeGreen })
  .resize(512, 512)
  .png()
  .toFile(path.join(iconsDir, 'icon-maskable-512.png'));

console.log('Logo master:', master);
console.log('PWA icons generated in public/icons/');
