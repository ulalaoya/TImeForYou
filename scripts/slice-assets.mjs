// slice-assets.mjs
// Crops the TimeForYou sprite sheet into individual PNG assets under public/assets/.
//
// Technique: for each asset we define a generous bounding box [left, top, width, height]
// in source-image pixel coordinates (sheet is 1536x1024), crop it, auto-trim the near-white
// background, then re-pad with a uniform white border so every asset looks consistent.
//
// To adjust an asset, edit its box in the tables below and re-run:  node scripts/slice-assets.mjs
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'TimeForYou Icons & Logo.png');
const OUT = join(ROOT, 'public', 'assets');

const PAD = 12;                 // white padding added after trimming
const TRIM_THRESHOLD = 25;      // how close to white counts as background
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// ---------------------------------------------------------------------------
// COORDINATE TABLES  (left, top, width, height) in source pixels
// ---------------------------------------------------------------------------

// Logo
const LOGO = {
  'logo-full': [40, 20, 384, 312],   // clock+heart + wordmark + slogan
  'logo-mark': [120, 22, 200, 165],  // just the clock + heart symbol
};

// NOTE: avatar/icon boxes below were derived by white-gap column segmentation of the
// sheet (see _segment*.mjs), then padded ~7px per side. Boxes are then auto-trimmed.

// Avatars — band 2 left: 7 seated babies
const AVATARS_BABY = [
  [48, 395, 89, 135],
  [151, 395, 90, 135],
  [252, 395, 84, 135],
  [352, 395, 86, 135],
  [459, 395, 87, 135],
  [562, 395, 87, 135],
  [664, 395, 85, 135],
];

// Avatars — band 2 right: 6 standing toddlers (arms outstretched)
const AVATARS_TODDLER = [
  [795, 384, 101, 140],
  [917, 384, 95, 140],
  [1035, 384, 97, 140],
  [1150, 384, 96, 140],
  [1261, 384, 97, 140],
  [1374, 384, 97, 140],
];

// Avatars — band 4: small children (head+shoulders). Sheet has 14; we export all 14
// (the right-most one is near the sheet edge).
const AVATARS_KID = [
  [60, 838, 73, 104],
  [155, 838, 73, 104],
  [254, 838, 75, 104],
  [360, 838, 68, 104],
  [460, 838, 91, 104],
  [554, 838, 77, 104],
  [652, 838, 76, 104],
  [748, 838, 73, 104],
  [844, 838, 79, 104],
  [959, 838, 69, 104],
  [1071, 838, 74, 104],
  [1171, 838, 80, 104],
  [1279, 838, 73, 104],
  [1384, 838, 71, 104],
];

// Bottom nav icons (icon only; box kept above the caption text)
const NAV = {
  'nav-home':          [312, 944, 56, 42],
  'nav-my-bookings':   [495, 944, 58, 42],
  'nav-new-booking':   [677, 944, 58, 42],
  'nav-favorites':     [844, 944, 57, 42],
  'nav-notifications': [1008, 944, 53, 42],
  'nav-profile':       [1173, 944, 56, 42],
};

// General icons (icon only; boxes kept above the Hebrew caption)
const ICONS = {
  // schedule/availability row 1
  'icon-calendar':    [465, 50, 88, 88],
  'icon-clock':       [576, 50, 90, 88],
  'icon-approved':    [687, 50, 99, 88],
  'icon-saved-time':  [803, 50, 84, 88],
  'icon-request':     [918, 50, 99, 88],
  // schedule/availability row 2 (times of day)
  'icon-morning':     [469, 210, 93, 82],
  'icon-noon':        [584, 210, 87, 82],
  'icon-evening':     [695, 210, 91, 82],
  'icon-night':       [814, 210, 80, 82],
  // profiles & people
  'icon-babysitter':  [1102, 46, 94, 98],
  'icon-parents':     [1225, 46, 108, 98],
  'icon-child':       [1361, 46, 100, 98],
  'icon-messages':    [1374, 208, 82, 94],
  // love & security
  'icon-heart':       [1220, 583, 64, 67],
  'icon-shield':      [1309, 583, 61, 67],
  'icon-house-heart': [1394, 583, 74, 67],
  // toys
  'icon-teddy':       [437, 583, 69, 67],
  'icon-blocks':      [602, 583, 69, 67],
  'icon-ball':        [758, 583, 68, 67],
  'icon-puzzle':      [689, 698, 71, 62],
};

// ---------------------------------------------------------------------------

async function cut(name, box) {
  const [left, top, width, height] = box;
  // Materialize the crop to a buffer FIRST. Chaining .extract().trim() in a single
  // pipeline makes sharp's trim operate on the whole sheet, not the crop.
  const cropped = await sharp(SRC).extract({ left, top, width, height }).toBuffer();
  let img = sharp(cropped);
  // auto-trim the near-white background, then re-pad uniformly
  try {
    img = sharp(await img.trim({ background: WHITE, threshold: TRIM_THRESHOLD }).toBuffer());
  } catch {
    // trim can fail if the crop is a single flat colour — fall back to the raw crop
    img = sharp(cropped);
  }
  await img
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: WHITE })
    .flatten({ background: WHITE })
    .png()
    .toFile(join(OUT, `${name}.png`));
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const manifestAvatars = [];
  const manifestIcons = {};

  // Logo
  for (const [name, box] of Object.entries(LOGO)) await cut(name, box);

  // Avatars
  const groups = [
    ['baby', AVATARS_BABY],
    ['toddler', AVATARS_TODDLER],
    ['kid', AVATARS_KID],
  ];
  for (const [kind, boxes] of groups) {
    for (let i = 0; i < boxes.length; i++) {
      const id = `${kind}-${i + 1}`;
      const file = `avatar-${id}.png`;
      await cut(`avatar-${id}`, boxes[i]);
      manifestAvatars.push({ id, file });
    }
  }

  // Nav icons
  for (const [name, box] of Object.entries(NAV)) await cut(name, box);

  // General icons
  for (const [name, box] of Object.entries(ICONS)) {
    await cut(name, box);
    const key = name.replace(/^icon-/, '');
    manifestIcons[key] = `${name}.png`;
  }

  // PWA icons derived from logo-mark
  const markBuf = await sharp(join(OUT, 'logo-mark.png')).toBuffer();
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.72);
    const resized = await sharp(markBuf)
      .resize(inner, inner, { fit: 'contain', background: WHITE })
      .toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: WHITE },
    })
      .composite([{ input: resized, gravity: 'center' }])
      .png()
      .toFile(join(OUT, `pwa-${size}.png`));
  }

  // manifest.json
  const manifest = { avatars: manifestAvatars, icons: manifestIcons };
  await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(
    `Done. ${manifestAvatars.length} avatars, ${Object.keys(manifestIcons).length} icons, ` +
    `nav+logo+pwa extras. Output: ${OUT}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
