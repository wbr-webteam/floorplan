// -------- Detection: Otsu threshold + connected components --------
export function detectBoothRects(image, region = null) {
  const fullW = image.naturalWidth, fullH = image.naturalHeight;
  const r = region || { x: 0, y: 0, width: fullW, height: fullH };
  const MAX_SIDE = 1400;
  const scale = Math.min(1, MAX_SIDE / Math.max(r.width, r.height));
  const cw = Math.round(r.width * scale), ch = Math.round(r.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, r.x, r.y, r.width, r.height, 0, 0, cw, ch);
  const { data } = ctx.getImageData(0, 0, cw, ch);

  const gray = new Uint8Array(cw * ch);
  for (let i = 0; i < cw * ch; i++)
    gray[i] = (data[i*4] + data[i*4+1] + data[i*4+2]) / 3;

  // Otsu
  const hist = new Array(256).fill(0);
  for (let i = 0; i < cw*ch; i++) hist[gray[i]]++;
  const total = cw*ch;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, varMax = 0, threshold = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (wB === 0) continue;
    const wF = total - wB; if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > varMax) { varMax = v; threshold = i; }
  }

  const binary = new Uint8Array(cw*ch);
  for (let i = 0; i < cw*ch; i++) binary[i] = gray[i] > threshold ? 1 : 0;

  const labels = new Int32Array(cw*ch);
  const queue = new Int32Array(cw*ch);
  const comps = [];
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const idx = y*cw + x;
    if (binary[idx] === 0 || labels[idx] !== 0) continue;
    let head = 0, tail = 0;
    queue[tail++] = idx;
    labels[idx] = comps.length + 1;
    let minX = x, minY = y, maxX = x, maxY = y, area = 0;
    while (head < tail) {
      const ci = queue[head++];
      const cx = ci % cw, cy = (ci - cx) / cw;
      area++;
      if (cx < minX) minX = cx; if (cy < minY) minY = cy;
      if (cx > maxX) maxX = cx; if (cy > maxY) maxY = cy;
      if (cx > 0)      { const ni = ci - 1;  if (binary[ni] && !labels[ni]) { labels[ni] = labels[idx]; queue[tail++] = ni; } }
      if (cx < cw - 1) { const ni = ci + 1;  if (binary[ni] && !labels[ni]) { labels[ni] = labels[idx]; queue[tail++] = ni; } }
      if (cy > 0)      { const ni = ci - cw; if (binary[ni] && !labels[ni]) { labels[ni] = labels[idx]; queue[tail++] = ni; } }
      if (cy < ch - 1) { const ni = ci + cw; if (binary[ni] && !labels[ni]) { labels[ni] = labels[idx]; queue[tail++] = ni; } }
    }
    comps.push({ minX, minY, maxX, maxY, area });
  }

  const minDim = Math.min(cw, ch);
  const minSide = Math.max(8, minDim * 0.012);
  const maxSide = minDim * 0.22;
  const out = [];
  for (const c of comps) {
    const bw = c.maxX - c.minX + 1;
    const bh = c.maxY - c.minY + 1;
    if (bw < minSide || bh < minSide) continue;
    if (bw > maxSide || bh > maxSide) continue;
    if (bw > cw * 0.6 || bh > ch * 0.6) continue;
    const aspect = bw / bh;
    if (aspect < 0.5 || aspect > 2) continue;
    if (c.area / (bw * bh) < 0.55) continue;
    out.push({
      x: r.x + c.minX / scale, y: r.y + c.minY / scale,
      width: bw / scale, height: bh / scale,
    });
  }
  return out;
}

export function groupRows(rects) {
  if (!rects.length) return [];
  const sorted = [...rects].sort((a, b) => a.y - b.y);
  const avgH = sorted.reduce((s, r) => s + r.height, 0) / sorted.length;
  const gap = avgH * 0.6;
  const rows = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = rows[rows.length - 1][rows[rows.length - 1].length - 1];
    if (Math.abs(sorted[i].y - last.y) <= gap) rows[rows.length - 1].push(sorted[i]);
    else rows.push([sorted[i]]);
  }
  rows.forEach(row => row.sort((a, b) => a.x - b.x));
  return rows;
}

export function fallbackLabel(rowIdx, colIdx) {
  const letter = rowIdx < 26
    ? String.fromCharCode(65 + rowIdx)
    : String.fromCharCode(64 + Math.floor(rowIdx / 26)) + String.fromCharCode(65 + (rowIdx % 26));
  return `${letter}${colIdx + 1}`;
}
