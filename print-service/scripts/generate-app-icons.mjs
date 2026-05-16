/**
 * Sincroniza el logo desde pwa-admin y genera iconos Tauri (macOS .icns, Windows .ico, PNGs).
 *
 * Fuente: ../pwa-admin/public/logo.png → assets/logo.png
 * Cuadrado: assets/logo-square.png (requerido por `tauri icon`)
 * Salida: src-tauri/icons/
 *
 * Uso: npm run generate-icons
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const adminLogo = path.join(root, "..", "pwa-admin", "public", "logo.png");
const assetsDir = path.join(root, "assets");
const assetsLogo = path.join(assetsDir, "logo.png");
const squareLogo = path.join(assetsDir, "logo-square.png");
const iconsOut = path.join(root, "src-tauri", "icons");
const publicDir = path.join(root, "public");
const tauriCli = path.join(root, "node_modules", "@tauri-apps", "cli", "tauri.js");

const SQUARE_SIZE = 1024;
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function syncLogoFromAdmin() {
  if (!fs.existsSync(adminLogo)) {
    if (fs.existsSync(assetsLogo)) {
      console.warn(`No se encontró ${adminLogo}; se usa assets/logo.png existente.`);
      return;
    }
    console.error(`Falta el logo fuente: ${adminLogo}`);
    process.exit(1);
  }
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.copyFileSync(adminLogo, assetsLogo);
  console.log(`Logo copiado: pwa-admin/public/logo.png → assets/logo.png`);
}

/** Tauri exige PNG cuadrado; el logo original puede ser casi cuadrado (p. ej. 1656×1648). */
async function buildSquareSource() {
  await sharp(assetsLogo)
    .resize(SQUARE_SIZE, SQUARE_SIZE, {
      fit: "contain",
      position: "center",
      background: WHITE,
    })
    .png({ compressionLevel: 9 })
    .toFile(squareLogo);
  console.log(`Fuente cuadrada: assets/logo-square.png (${SQUARE_SIZE}×${SQUARE_SIZE})`);
}

/** Favicon opcional para la UI Vite (ventana dev / recursos web). */
async function buildWebFavicons() {
  fs.mkdirSync(publicDir, { recursive: true });
  const [b32, b180] = await Promise.all([
    sharp(squareLogo).resize(32, 32).png().toBuffer(),
    sharp(squareLogo).resize(180, 180).png().toBuffer(),
  ]);
  fs.writeFileSync(path.join(publicDir, "favicon-32x32.png"), b32);
  fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), b180);
  fs.copyFileSync(squareLogo, path.join(publicDir, "logo.png"));
  console.log("Favicons web: public/favicon-32x32.png, public/apple-touch-icon.png, public/logo.png");
}

function runTauriIcon() {
  if (!fs.existsSync(tauriCli)) {
    console.error("Ejecutá npm install en print-service antes de generar iconos.");
    process.exit(1);
  }
  fs.mkdirSync(iconsOut, { recursive: true });
  const result = spawnSync(
    process.execPath,
    [tauriCli, "icon", squareLogo, "-o", iconsOut, "--ios-color", "#ffffff"],
    { cwd: root, stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  console.log(`Iconos Tauri en ${path.relative(root, iconsOut)}/ (icon.icns, icon.ico, …)`);
}

await syncLogoFromAdmin();
await buildSquareSource();
await buildWebFavicons();
runTauriIcon();
