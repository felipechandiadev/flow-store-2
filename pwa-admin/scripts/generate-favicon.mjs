import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public", "fav.png");

async function rasterPng(size) {
  return sharp(src)
    .resize(size, size, {
      fit: "contain",
      position: "center",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(src)) {
    console.error(`Missing source: ${src}`);
    process.exit(1);
  }

  const [b16, b32, b48] = await Promise.all([
    rasterPng(16),
    rasterPng(32),
    rasterPng(48),
  ]);

  const ico = await pngToIco([b16, b32, b48]);
  fs.writeFileSync(path.join(root, "app", "favicon.ico"), ico);

  await sharp(src)
    .resize(32, 32, {
      fit: "contain",
      position: "center",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, "app", "icon.png"));

  await sharp(src)
    .resize(180, 180, {
      fit: "contain",
      position: "center",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, "app", "apple-icon.png"));

  const favSize = fs.statSync(path.join(root, "app", "favicon.ico")).size;
  const iconSize = fs.statSync(path.join(root, "app", "icon.png")).size;
  const appleSize = fs.statSync(path.join(root, "app", "apple-icon.png")).size;
  console.log(
    `Wrote app/favicon.ico (${favSize} B), app/icon.png (${iconSize} B), app/apple-icon.png (${appleSize} B)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
