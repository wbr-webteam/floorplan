// -------- Adjacency helpers (for double-booth partner search) --------
// Returns { vertical, horizontal } — each is the nearest empty adjacent
// booth in that orientation (or null if none). "Vertical" means one is
// stacked above/below the other with overlapping X. "Horizontal" means
// side-by-side with overlapping Y.
export function findAdjacentPartners(booth, allBooths) {
  const tol = Math.max(booth.width, booth.height) * 0.25;
  const candidates = allBooths.filter(b =>
    b.levelId === booth.levelId && b.id !== booth.id && !b.sponsorId);
  const isVert = (a, b) => {
    const aL = a.x, aR = a.x + a.width, aT = a.y, aB = a.y + a.height;
    const bL = b.x, bR = b.x + b.width, bT = b.y, bB = b.y + b.height;
    const vGap = Math.min(Math.abs(aB - bT), Math.abs(bB - aT));
    const hOverlap = Math.min(aR, bR) - Math.max(aL, bL);
    return vGap <= tol && hOverlap > 0;
  };
  const isHoriz = (a, b) => {
    const aL = a.x, aR = a.x + a.width, aT = a.y, aB = a.y + a.height;
    const bL = b.x, bR = b.x + b.width, bT = b.y, bB = b.y + b.height;
    const hGap = Math.min(Math.abs(aR - bL), Math.abs(bR - aL));
    const vOverlap = Math.min(aB, bB) - Math.max(aT, bT);
    return hGap <= tol && vOverlap > 0;
  };
  const nearestOf = (list) => {
    if (!list.length) return null;
    list.sort((p, q) => {
      const dp = Math.hypot((booth.x+booth.width/2) - (p.x+p.width/2), (booth.y+booth.height/2) - (p.y+p.height/2));
      const dq = Math.hypot((booth.x+booth.width/2) - (q.x+q.width/2), (booth.y+booth.height/2) - (q.y+q.height/2));
      return dp - dq;
    });
    return list[0];
  };
  return {
    vertical:   nearestOf(candidates.filter(c => isVert(booth, c))),
    horizontal: nearestOf(candidates.filter(c => isHoriz(booth, c))),
  };
}

// Pick the appropriate partner given the current orientation setting.
// - 'vertical' / 'horizontal' → strict; returns null if that orientation has no partner
// - 'user-toggle' → prefers `preferred`, falls back to whichever is available
export function pickPartnerBySetting(booth, allBooths, orientation, preferred) {
  const parts = findAdjacentPartners(booth, allBooths);
  if (orientation === 'vertical')   return parts.vertical;
  if (orientation === 'horizontal') return parts.horizontal;
  if (preferred === 'vertical'   && parts.vertical)   return parts.vertical;
  if (preferred === 'horizontal' && parts.horizontal) return parts.horizontal;
  return parts.vertical || parts.horizontal;
}

// Backwards-compat alias used in a few spots — always returns something
// that fits the current orientation setting (falls back to any adjacent).
export function findAdjacentEmpty(booth, allBooths, orientation = 'user-toggle') {
  return pickPartnerBySetting(booth, allBooths, orientation);
}
