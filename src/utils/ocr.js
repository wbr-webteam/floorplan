import { groupRows, fallbackLabel } from './boothDetection.js';

// -------- OCR (Tesseract.js) --------
// Tesseract is a global provided by the tesseract.js <script> tag in
// index.html (not npm-bundled).
let ocrWorker = null;
async function getOcrWorker() {
  if (ocrWorker) return ocrWorker;
  ocrWorker = await Tesseract.createWorker('eng');
  await ocrWorker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
    tessedit_pageseg_mode: '7',
  });
  return ocrWorker;
}

export function buildOcrCanvas(image, rect) {
  const inset = Math.max(2, Math.min(rect.width, rect.height) * 0.08);
  const sw = rect.width - 2*inset, sh = rect.height - 2*inset;
  if (sw < 6 || sh < 6) return null;
  const targetShort = 160;
  const scale = Math.max(1, targetShort / Math.min(sw, sh));
  const cw = Math.round(sw * scale), ch = Math.round(sh * scale);
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(image, rect.x+inset, rect.y+inset, sw, sh, 0, 0, cw, ch);
  const imgData = ctx.getImageData(0, 0, cw, ch);
  const data = imgData.data;
  const hist = new Array(256).fill(0);
  const grays = new Uint8Array(cw * ch);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = (data[i] + data[i+1] + data[i+2]) / 3 | 0;
    grays[p] = g; hist[g]++;
  }
  const total = cw*ch;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, varMax = 0, threshold = 160;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (wB === 0) continue;
    const wF = total - wB; if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > varMax) { varMax = v; threshold = i; }
  }
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const v = grays[p] > threshold ? 255 : 0;
    data[i] = data[i+1] = data[i+2] = v;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

async function readOcrLabel(image, rect) {
  const canvas = buildOcrCanvas(image, rect);
  if (!canvas) return '';
  const w = await getOcrWorker();
  const clean = (s) => (s || '').replace(/[^A-Za-z0-9-]/g, '').toUpperCase().trim();
  let txt = clean((await w.recognize(canvas)).data.text);
  if (!txt) {
    await w.setParameters({ tessedit_pageseg_mode: '6' });
    txt = clean((await w.recognize(canvas)).data.text);
    await w.setParameters({ tessedit_pageseg_mode: '7' });
  }
  if (!txt || txt === '-' || txt.length > 12) return '';
  return txt;
}

export async function labelRectsWithOcr(image, rects, onProgress) {
  const rows = groupRows(rects);
  const results = new Map();
  const seen = new Set();
  let done = 0;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const rect = rows[r][c];
      let label = '';
      try { label = await readOcrLabel(image, rect); } catch (_) { label = ''; }
      if (!label || seen.has(label)) {
        label = fallbackLabel(r, c);
        let unique = label, n = 1;
        while (seen.has(unique)) unique = `${label}.${++n}`;
        label = unique;
      }
      seen.add(label);
      results.set(rect, label);
      done++;
      onProgress?.({ done, total: rects.length, label });
    }
  }
  return rects.map(x => ({ ...x, label: results.get(x) || 'X' }));
}
