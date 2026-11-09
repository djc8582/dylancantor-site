// Builds the responsive AVIF/WebP variants in /opt from the originals in /img.
//   npm i --no-save sharp && node tools/make-images.mjs
// Output names carry a hash of the source file, so /opt/* can be cached forever
// (see _headers). Re-run after replacing an image in /img, then update the
// <picture> srcsets in the HTML (the script prints opt/manifest.json with the names).
import sharp from "sharp";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";

// source file -> output widths (px). "ui" = screenshots/logos/graphics (keep full chroma).
// Widths are picked so width*H/W is a whole number where possible: a variant with the
// exact aspect ratio of the original lays out identically (no sub-pixel height drift).
// (HearMe shots are 620x1347, which has no such widths, so they only get a 620w variant.)
const SPEC = {
  "photo-drums.jpg":            { w: [420, 700, 980, 1400] },
  "wsn-clubs.jpg":              { w: [174, 700, 1400] },
  "jamarama-hackathon.jpg":     { w: [700, 1400] },
  "music-growing-sqime.jpg":    { w: [300, 600, 900, 1200] },
  "photo-closequarters.jpg":    { w: [174, 480, 760, 1200] },
  "jamarama-avatars.png":       { w: [96, 174], ui: true },
  "logo-clockworks.png":        { w: [96, 174], ui: true },
  "logo-clubs.png":             { w: [96, 174], ui: true },
  "logo-hearme.png":            { w: [96, 174], ui: true },
  "logo-ircam.png":             { w: [96, 174], ui: true },
  "logo-euler.png":             { w: [96, 174], ui: true },
  "logo-biophony.png":          { w: [96, 174], ui: true },
  "ifeellike-spectrogram.png":  { w: [600, 900, 1200], ui: true, q: 60 },
};
for (const f of readdirSync("img")) if (/^clubs-store-/.test(f)) SPEC[f] = { w: [310, 465, 620], ui: true };
for (const f of readdirSync("img")) if (/^hearme-0[2357]/.test(f)) SPEC[f] = { w: [620], ui: true };
// Biophony creatures: frame 0 (idle) of each 4x4 sprite sheet, 256x256 with alpha.
for (const f of readdirSync("img")) if (/^biophony-/.test(f)) SPEC[f] = { w: [128, 256], ui: true };

mkdirSync("opt", { recursive: true });
for (const f of readdirSync("opt")) rmSync("opt/" + f);
const manifest = {};
for (const [file, s] of Object.entries(SPEC)) {
  const src = "img/" + file;
  const buf = readFileSync(src);
  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 8);
  const base = file.replace(/\.[^.]+$/, "");
  const meta = await sharp(buf).metadata();
  const out = { width: meta.width, height: meta.height, avif: [], webp: [] };
  for (const w0 of s.w) {
    const w = Math.min(w0, meta.width);
    const img = () => sharp(buf).resize({ width: w, withoutEnlargement: true });
    const a = `opt/${base}.${hash}-${w}.avif`, b = `opt/${base}.${hash}-${w}.webp`;
    await img().avif({ quality: s.q ?? (s.ui ? 60 : 50), effort: 6, chromaSubsampling: s.ui ? "4:4:4" : "4:2:0" }).toFile(a);
    await img().webp({ quality: s.ui ? 82 : 75, effort: 6 }).toFile(b);
    out.avif.push([a, w]); out.webp.push([b, w]);
  }
  manifest[file] = out;
}
writeFileSync("opt/manifest.json", JSON.stringify(manifest, null, 1));
console.log("wrote", Object.keys(manifest).length, "images");
