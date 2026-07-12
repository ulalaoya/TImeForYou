// עזרי נכסים — בניית נתיבים יחסיים (עובד ב-GitHub Pages תחת כל שם ריפו).

const BASE = import.meta.env.BASE_URL || './';

export function assetUrl(file) {
  // BASE כבר מסתיים ב-'/'
  return `${BASE}assets/${file}`;
}

let manifestPromise = null;
export function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(assetUrl('manifest.json')).then((r) => r.json());
  }
  return manifestPromise;
}

export function avatarUrl(avatarId, manifest) {
  if (!manifest) return '';
  const a = manifest.avatars.find((x) => x.id === avatarId);
  return a ? assetUrl(a.file) : '';
}

export function iconUrl(name, manifest) {
  if (!manifest || !manifest.icons[name]) return '';
  return assetUrl(manifest.icons[name]);
}
