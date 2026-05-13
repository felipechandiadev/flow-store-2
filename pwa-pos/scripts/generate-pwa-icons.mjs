/**
 * Genera iconos PWA y favicons desde `public/logo.png` (contain + fondo blanco).
 * Requisitos: sharp, png-to-ico (devDependencies).
 *
 * Uso: node scripts/generate-pwa-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public", "logo.png");
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");
const appDir = path.join(root, "src", "app");

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function rasterContain(size) {
  return sharp(src)
    .resize(size, size, {
      fit: "contain",
      position: "center",
      background: WHITE,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Icono maskable: logo ~72% del lado, centrado sobre lienzo blanco (zona segura). */
async function rasterMaskable(size) {
  const inner = Math.round(size * 0.72);
  const padding = Math.floor((size - inner) / 2);
  const body = await sharp(src)
    .resize(inner, inner, {
      fit: "contain",
      position: "center",
      background: WHITE,
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: WHITE,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return sharp(body).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

async function main() {
  if (!fs.existsSync(src)) {
    console.error(`Missing source: ${src}`);
    process.exit(1);
  }

  fs.mkdirSync(iconsDir, { recursive: true });

  const [b16, b32, b48, fav32, apple180, a192, a512, m192, m512, tile150, logo1024, shortcut192] =
    await Promise.all([
      rasterContain(16),
      rasterContain(32),
      rasterContain(48),
      rasterContain(32),
      rasterContain(180),
      rasterContain(192),
      rasterContain(512),
      rasterMaskable(192),
      rasterMaskable(512),
      rasterContain(150),
      rasterContain(1024),
      rasterContain(192),
    ]);

  const ico = await pngToIco([b16, b32, b48]);
  fs.writeFileSync(path.join(appDir, "favicon.ico"), ico);
  fs.writeFileSync(path.join(appDir, "icon.png"), fav32);
  fs.writeFileSync(path.join(appDir, "apple-icon.png"), apple180);

  fs.writeFileSync(path.join(publicDir, "favicon-16x16.png"), b16);
  fs.writeFileSync(path.join(publicDir, "favicon-32x32.png"), b32);
  fs.writeFileSync(path.join(publicDir, "android-chrome-192x192.png"), a192);
  fs.writeFileSync(path.join(publicDir, "android-chrome-512x512.png"), a512);
  fs.writeFileSync(path.join(publicDir, "android-chrome-192x192-maskable.png"), m192);
  fs.writeFileSync(path.join(publicDir, "android-chrome-512x512-maskable.png"), m512);
  fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), apple180);
  fs.writeFileSync(path.join(publicDir, "mstile-150x150.png"), tile150);
  fs.writeFileSync(path.join(publicDir, "logo-app.png"), logo1024);
  fs.writeFileSync(path.join(iconsDir, "shortcut-dashboard.png"), shortcut192);
  fs.writeFileSync(path.join(iconsDir, "shortcut-pos.png"), shortcut192);

  console.log(
    "Wrote src/app/favicon.ico, src/app/icon.png, src/app/apple-icon.png + public PWA assets (from public/logo.png).",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
