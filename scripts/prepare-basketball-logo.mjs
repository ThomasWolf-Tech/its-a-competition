// Apply only the generated basketball line changes to the original trophy.
import sharp from 'sharp';
import fs from 'node:fs';
const basePath = 'public/brand/rally-relic-color.png'; // bracket-free, pre-seam-edit original
const generatedPath = 'docs/brand/logo-concepts/basketball-linework-reference.png';
const output = 'public/brand/rally-relic-trophy-v2.png';
const { data: base, info } = await sharp(basePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { data: edit, info: editInfo } = await sharp(generatedPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height;
if (w !== editInfo.width || h !== editInfo.height) throw Error('The seam edit must keep the original canvas and alignment.');
const top = new Array(w).fill(null), bottom = new Array(w).fill(null);
for (let x = 280; x <= 650; x++) for (let y = 235; y <= 680; y++) {
  const p = (y * w + x) * 4;
  if (base[p] > 150 && base[p + 1] > 100 && base[p + 2] < 140 && base[p] - base[p + 2] > 70 && base[p + 3] > 200) {
    top[x] ??= y; bottom[x] = y;
  }
}
const median = values => { const a = values.filter(v => v !== null).sort((a, b) => a - b); return a.length ? a[Math.floor(a.length / 2)] : null; };
let mask = new Uint8Array(w * h);
for (let x = 280; x <= 650; x++) {
  if (top[x] === null) continue;
  const first = Math.min(top[x], median(top.slice(Math.max(280, x - 21), Math.min(651, x + 22))));
  const last = Math.max(bottom[x], median(bottom.slice(Math.max(280, x - 21), Math.min(651, x + 22))));
  for (let y = first + 2; y <= last - 2; y++) {
    const z = y * w + x, p = z * 4;
    // Protect other logo colors and all existing alpha/outline geometry.
    if (!base[p + 3] || (base[p + 2] > base[p] && base[p + 2] > 90) || (base[p] > 160 && base[p + 1] > 160 && base[p + 2] > 140)) continue;
    mask[z] = 1;
  }
}
// Row spans heal the old seam endpoints that meet a curved panel boundary.
for (let y = 235; y <= 680; y++) {
  let left = null, right = null;
  for (let x = 280; x <= 650; x++) {
    const p = (y * w + x) * 4;
    if (base[p] > 150 && base[p + 1] > 100 && base[p + 2] < 140 && base[p] - base[p + 2] > 70 && base[p + 3] > 200) { left ??= x; right = x; }
  }
  if (left === null) continue;
  for (let x = left; x <= right; x++) {
    const p = (y * w + x) * 4;
    if (base[p + 3] && !(base[p + 2] > base[p] && base[p + 2] > 90) && !(base[p] > 160 && base[p + 1] > 160 && base[p + 2] > 140)) mask[y * w + x] = 1;
  }
}
// Close seam-width notches at the panel perimeter without expanding its outline.
for (const operation of ['dilate', 'erode']) for (let pass = 0; pass < 15; pass++) {
  const next = new Uint8Array(w * h);
  for (let y = 220; y <= 700; y++) for (let x = 260; x <= 675; x++) {
    const z = y * w + x;
    next[z] = operation === 'dilate'
      ? Number(Boolean(mask[z] || mask[z - 1] || mask[z + 1] || mask[z - w] || mask[z + w]))
      : Number(Boolean(mask[z] && mask[z - 1] && mask[z + 1] && mask[z - w] && mask[z + w]));
  }
  mask = next;
}
for (let z = 0; z < w * h; z++) {
  const p = z * 4;
  if (!base[p + 3] || (base[p + 2] > base[p] && base[p + 2] > 90) || (base[p] > 160 && base[p + 1] > 160 && base[p + 2] > 140)) mask[z] = 0;
}
const result = Buffer.from(base); let changed = 0;
for (let y = 235; y <= 680; y++) for (let x = 280; x <= 650; x++) {
  const z = y * w + x;
  if (!mask[z]) continue;
  const p = z * 4;
  for (let c = 0; c < 3; c++) result[p + c] = edit[p + c];
  if (!result.subarray(p, p + 4).equals(base.subarray(p, p + 4))) changed++;
}
await sharp(result, { raw: { width: w, height: h, channels: 4 } }).png().toFile(output);
const saved = await sharp(output).ensureAlpha().raw().toBuffer();
let changedOutside = 0, changedAlpha = 0;
for (let z = 0; z < w * h; z++) {
  const p = z * 4;
  if (!mask[z] && !saved.subarray(p, p + 4).equals(base.subarray(p, p + 4))) changedOutside++;
  if (saved[p + 3] !== base[p + 3]) changedAlpha++;
}
if (changedOutside || changedAlpha) throw Error('Only basketball linework may change.');
await sharp(output).resize(128, 128).png().toFile('/private/tmp/brack-it-basketball-icon.png');
fs.copyFileSync('/private/tmp/brack-it-basketball-icon.png', 'src/app/icon.png');
await sharp(output).extract({ left: 270, top: 220, width: 420, height: 490 }).resize(840, 980).png().toFile('/private/tmp/brack-it-basketball-after.png');
console.log({ basketballPixelsChanged: changed, pixelsChangedOutsideBasketball: changedOutside, alphaPixelsChanged: changedAlpha });
