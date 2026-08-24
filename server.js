// Booth Selector — minimal Node/Express server for Render.
//
// Responsibilities right now:
//   1. Serve the built SPA from dist/ (Vite build - see vite.config.js).
//   2. Expose /api/scrape?url=… so the app can fetch sponsor pages
//      without CORS issues (public proxies were unreliable).
//   3. Optional Basic Auth gate via BASIC_AUTH_USER / BASIC_AUTH_PASS
//      env vars — turn on/off without redeploying by unsetting them.
//
// Structured so you can drop in real user accounts later without a
// rewrite — routes go in the block marked "FUTURE: /api/auth/*".

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------
// Basic Auth (optional, on when env vars are set)
// ---------------------------------------------------------------------
const BASIC_USER = process.env.BASIC_AUTH_USER;
const BASIC_PASS = process.env.BASIC_AUTH_PASS;

if (BASIC_USER && BASIC_PASS) {
  app.use((req, res, next) => {
    // Public API — /api/* is not gated. /healthz is always public too.
    // This keeps server-side proxies (scrape) and future auth endpoints
    // reachable to the app UI and to mobile clients.
    if (req.path.startsWith('/api/') || req.path === '/healthz') return next();
    const header = req.headers.authorization || '';
    const [scheme, encoded] = header.split(' ');
    if (scheme === 'Basic' && encoded) {
      const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');
      if (user === BASIC_USER && pass === BASIC_PASS) return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Booth Selector"');
    return res.status(401).send('Authentication required.');
  });
  console.log('[booth-selector] Basic Auth enabled for user:', BASIC_USER, '(API + /healthz remain public)');
}

// ---------------------------------------------------------------------
// Sponsor-page scraper proxy — bypasses CORS by fetching server-side.
//   GET /api/scrape?url=<encoded URL>
// Returns the raw response body with a permissive CORS header so the
// app can consume it. Restricted to http(s) URLs; guards against
// obvious SSRF targets (localhost / 169.254 / etc).
// ---------------------------------------------------------------------
app.get('/api/scrape', async (req, res) => {
  const target = req.query.url;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Missing url query parameter.' });
  }
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return res.status(400).json({ error: 'Invalid URL.' });
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return res.status(400).json({ error: 'Only http and https URLs are supported.' });
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return res.status(400).json({ error: 'Internal / private hosts are not allowed.' });
  }

  try {
    const upstream = await fetch(target, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'BoothSelector/1.0 (+https://github.com/wbr-webteam/floorplan)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const body = await upstream.text();
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', upstream.headers.get('content-type') || 'text/plain');
    res.status(upstream.status).send(body);
  } catch (e) {
    res.status(502).json({ error: 'Upstream fetch failed: ' + (e.message || String(e)) });
  }
});

// ---------------------------------------------------------------------
// FUTURE: /api/auth/* — user accounts, sessions, invites, magic links, …
//   POST /api/auth/login
//   POST /api/auth/logout
//   GET  /api/auth/me
//   POST /api/auth/register (invite-only)
// ---------------------------------------------------------------------

// Health check
app.get('/healthz', (_, res) => res.type('text/plain').send('ok'));

// Serve the built SPA (npm run build -> dist/, via vite.config.js)
const DIST_DIR = path.join(__dirname, 'dist');
app.use(express.static(DIST_DIR, { extensions: ['html'] }));
app.get('*', (_, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log(`[booth-selector] listening on :${PORT}`);
});
