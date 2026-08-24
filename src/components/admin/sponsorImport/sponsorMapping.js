import { uid } from '../../../utils/uid.js';

// -------- Sponsor import: normalise arbitrary JSON into our sponsor shape --------
// Given the parsed response body, try to locate an array of sponsor-like objects
// (top-level array, or wrapped in { data | sponsors | items | results | ... }).
export function findSponsorArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return null;
  const keys = ['data', 'sponsors', 'items', 'results', 'records', 'exhibitors'];
  for (const k of keys) if (Array.isArray(payload[k])) return payload[k];
  // Look one level deeper for a common wrapper like { data: { sponsors: [...] } }
  for (const k of Object.keys(payload)) {
    const v = payload[k];
    if (v && typeof v === 'object') {
      for (const k2 of keys) if (Array.isArray(v[k2])) return v[k2];
    }
  }
  return null;
}
// Case-insensitive picker across a list of candidate field names.
export function pickField(obj, candidates) {
  if (!obj || typeof obj !== 'object') return undefined;
  const map = Object.fromEntries(Object.keys(obj).map(k => [k.toLowerCase(), k]));
  for (const c of candidates) {
    const real = map[c.toLowerCase()];
    if (real !== undefined) {
      const v = obj[real];
      if (v !== null && v !== '' && v !== undefined) return v;
    }
  }
  return undefined;
}
export function mapImportedSponsors(rawArray, existingLevels) {
  const generalLevel = existingLevels.find(l => l.name.toLowerCase() === 'general') || existingLevels[0];
  return rawArray.map((raw, i) => {
    const name = pickField(raw, ['name', 'companyName', 'company_name', 'title', 'exhibitorName', 'displayName']) || `Sponsor ${i+1}`;
    const logo = pickField(raw, ['logoUrl', 'logo_url', 'logo', 'image', 'imageUrl', 'image_url', 'thumbnail', 'thumbnailUrl']);
    const site = pickField(raw, ['website', 'websiteUrl', 'website_url', 'url', 'homepage', 'link', 'profileUrl', 'profile_url']);
    const dbl  = pickField(raw, ['isDoubleBooth', 'is_double_booth', 'doubleBooth', 'double_booth']);
    const lvl  = pickField(raw, ['level', 'levelName', 'category', 'tier', 'sponsorLevel', 'sponsorship_level']);
    let levelId = generalLevel?.id;
    if (typeof lvl === 'string') {
      const match = existingLevels.find(l => l.name.toLowerCase() === lvl.toLowerCase());
      if (match) levelId = match.id;
    }
    return {
      id: uid(),
      name: String(name),
      levelId,
      isDoubleBooth: !!dbl,
      position: i,
      logoUrl: logo ? String(logo)
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(String(name))}&background=3B82F6&color=fff&size=128&font-size=0.4&bold=true&rounded=true`,
      website: site ? String(site) : null,
    };
  });
}
