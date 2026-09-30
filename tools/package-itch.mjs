import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outDir = resolve(root, "dist");
const zipPath = resolve(outDir, "quantum-billiards-itch.zip");

const runtimeEntries = [
  "index.html",
  "game.js",
  "styles.css",
  "visual-state.js",
  "xr-tabletop.js",
  "assets",
  "experience",
  "interactivity",
  "rendering",
  "vendor",
];

for (const entry of runtimeEntries) {
  if (!existsSync(resolve(root, entry))) {
    throw new Error(`Missing runtime entry: ${entry}`);
  }
}

mkdirSync(outDir, { recursive: true });
rmSync(zipPath, { force: true });
execFileSync("zip", ["-qr", zipPath, ...runtimeEntries], { cwd: root, stdio: "inherit" });
console.log(`Created ${zipPath}`);
