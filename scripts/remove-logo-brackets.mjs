// Removal-only mask for the approved raster. All surviving RGBA pixels come
// unchanged from the original. Erosion separates the two background brackets
// from the trophy; nearest-core labels restore the original anti-aliased edges.
import fs from 'node:fs';
import sharp from 'sharp';
(async () => {
  const original = 'docs/brand/logo-concepts/rally-relic-color-with-brackets.png';
  const output = 'public/brand/rally-relic-color.png';
  if (!fs.existsSync(original)) fs.copyFileSync(output, original);
  const { data, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info, n = w * h;
  let mask = Uint8Array.from({ length: n }, (_, i) => data[i * 4 + 3] >= 128 ? 1 : 0);
  for (let pass = 0; pass < 4; pass++) {
    const next = new Uint8Array(n);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      next[p] = mask[p] && mask[p - 1] && mask[p + 1] && mask[p - w] && mask[p + w] ? 1 : 0;
    }
    mask = next;
  }
  const visited = new Uint8Array(n), queue = new Uint32Array(n), components = [];
  const neighbors = p => {
    const x = p % w, a = [];
    if (x) a.push(p - 1); if (x < w - 1) a.push(p + 1);
    if (p >= w) a.push(p - w); if (p < n - w) a.push(p + w);
    return a;
  };
  for (let p = 0; p < n; p++) {
    if (!mask[p] || visited[p]) continue;
    let end = 1, start = 0; queue[0] = p; visited[p] = 1;
    while (start < end) for (const j of neighbors(queue[start++])) if (!visited[j] && mask[j]) { visited[j] = 1; queue[end++] = j; }
    if (end > 1000) components.push(Array.from(queue.subarray(0, end)));
  }
  components.sort((a, b) => b.length - a.length);
  if (components.length !== 3) throw Error('Expected the trophy and two bracket cores; inspect before changing the asset.');
  const labels = new Uint8Array(n); let start = 0, end = 0;
  components.forEach((points, index) => { for (const p of points) { labels[p] = index + 1; queue[end++] = p; } });
  while (start < end) {
    const p = queue[start++];
    for (const j of neighbors(p)) if (!labels[j]) { labels[j] = labels[p]; queue[end++] = j; }
  }
  const result = Buffer.from(data); let retained = 0, removed = 0;
  for (let p = 0; p < n; p++) {
    if (labels[p] !== 1) { if (data[p * 4 + 3]) removed++; result.fill(0, p * 4, p * 4 + 4); }
    else if (data[p * 4 + 3]) retained++;
  }
  await sharp(result, { raw: { width: w, height: h, channels: 4 } }).png().toFile(output);
  const saved = await sharp(output).ensureAlpha().raw().toBuffer();
  let changedForeground = 0;
  for (let i = 0; i < saved.length; i += 4) if (saved[i + 3] && !saved.subarray(i, i + 4).equals(data.subarray(i, i + 4))) changedForeground++;
  if (changedForeground) throw Error('Foreground pixels must be unchanged.');
  const icon = 'src/app/icon.png', iconInfo = await sharp(icon).metadata();
  await sharp(output).resize(iconInfo.width, iconInfo.height).png().toFile('/private/tmp/brack-it-updated-icon.png');
  fs.copyFileSync('/private/tmp/brack-it-updated-icon.png', icon);
  console.log({ retainedForegroundPixels: retained, removedBracketPixels: removed, changedForegroundPixels: changedForeground, width: w, height: h });
})();
