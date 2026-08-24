// A couple of public CORS proxies to try when direct fetch fails. These are
// third-party services — fine for demos, but for production you'd want your
// CMS to proxy the request server-side.
export async function fetchWithCorsFallback(url, headers = {}) {
  // 1) Our own backend at /api/scrape (present when deployed on Render/Node).
  //    Same origin so no CORS involved. `credentials: 'same-origin'` so Basic
  //    Auth (or later, session cookies) flow through — 'omit' would drop them
  //    and the request would 401. Silently skipped if 404 (static-only
  //    hosting like GitHub Pages).
  try {
    const r = await fetch('/api/scrape?url=' + encodeURIComponent(url), { credentials: 'same-origin' });
    if (r.ok) return await r.text();
  } catch (_) { /* backend not reachable — try direct */ }
  // 2) Direct fetch (works if the target sends permissive CORS headers)
  try {
    const r = await fetch(url, { headers, credentials: 'omit' });
    if (r.ok) return await r.text();
  } catch (_) { /* CORS or network */ }
  // 3) Public CORS proxies as a last resort
  const proxies = [
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  ];
  let lastErr = null;
  for (const build of proxies) {
    try {
      const r = await fetch(build(url), { credentials: 'omit' });
      if (r.ok) return await r.text();
      lastErr = new Error(`Proxy HTTP ${r.status}`);
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('All fetch attempts failed');
}
