# Floorplan — Exhibition Hall Booth Selector

Persistent brief for Claude Code sessions on this repo. Read this before making changes.

## What it is

Interactive exhibition-hall floor-plan tool. Admin uploads a PNG/JPG/PDF, the app auto-detects booth squares and OCRs their printed labels, then assigns sponsors to booths. Ships with three views:

- **Admin** — full editor: upload, scan region, OCR, edit booths, manage categories, assign sponsors, import sponsors, toggles.
- **Sponsor** — read/lock-in flow. Two-step confirm (Select → Confirm), draggable anchored action card next to the selected booth, pulse-highlight on selected + partner booths.
- **Public** — attendee-facing read-only. Tap a booth → sponsor name + logo + web link. Meant for a mobile WebView later.

Category system (Gold/Silver/General collapsed to just General; more can be added). Optional order enforcement (drag-sort sponsors, next-in-line rule). Double-booth flag with vertical / horizontal / user-toggle orientation. Sponsor logos rendered inside the booth SVG rectangle.

## Repo + deploys

- **Repo**: https://github.com/wbr-webteam/floorplan
- **GitHub Pages (static preview, no backend)**: https://wbr-webteam.github.io/floorplan/
- **Render (production w/ backend)**: https://floorplan-a89y.onrender.com/
  - Node web service, auto-deploys from `main`
  - Basic Auth on page HTML: `wbr` / `wbr` (env vars `BASIC_AUTH_USER`, `BASIC_AUTH_PASS`)
  - `/api/*` and `/healthz` are NOT gated — public by design so mobile clients and future public views work

Both deploys watch `main`. A `git push origin main` triggers both simultaneously.

## Architecture

Three files at repo root, no build step:

- `index.html` — the entire React SPA. React 18 from unpkg CDN. JSX transpiled in the browser by Babel Standalone. ~148 KB.
- `server.js` — Express server. Serves `index.html`, provides `/api/scrape` HTML-proxy endpoint (bypass CORS for the WBR sponsor-page scraper).
- `package.json` — `express` only.

No bundler, no lint, no tests yet. `npm start` runs `node server.js`.

## Critical implementation notes

**Babel classic runtime — do not change.** The `<script type="text/babel-src" id="app-source">` block at the top of `index.html` holds all React code. The `<script>` at the tail of the file explicitly runs `Babel.transform(src, { presets: [['react', { runtime: 'classic' }]] })`. **Do not** switch to the automatic runtime or use plain `<script type="text/babel">` — newer `@babel/standalone` defaults emit `require("react/jsx-runtime")` which is invalid in a plain browser and produces a blank page.

**State shape.** `useStoreProvider()` custom hook holds all state; distributed via React Context. Reads via `useStore()`. The store contains: `role`, `floorPlan`, `booths`, `levels`, `sponsors`, `settings`, `activeSponsorId`, `projects`, `currentProjectId`. Actions mutate through setters returned by the hook.

**Everything is in-memory** except saved projects. Projects persist to `localStorage` under key `booth-selector-v2-projects`. When user accounts land, this needs to move server-side.

**Category = level internally.** The rename from "level" to "category" was UI-only. Variables, IDs, and field names still use `level` / `levelId` / `boothsAtLevel`. Don't rename these mechanically — it churns the diff for no benefit.

**Sponsor import — 4 paths.** Website URL (default; uses `/api/scrape`), Paste HTML, API URL (JSON), Paste JSON. Field mapping is flexible — see `findSponsorArray` and `pickField` for name-variant handling (`name` / `companyName` / `title`, `logo` / `logoUrl` / `image`, etc.).

**OCR.** Tesseract.js from CDN. `buildOcrCanvas` upscales the cropped booth region to at least 160 px short side, then Otsu-binarizes — small booth labels wouldn't OCR without this. PSM 7 first, retry PSM 6 if empty. Fallback labels (`A1`, `B2`, …) for unreadable booths.

**pdf.js worker from jsDelivr.** `pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + pdfjsLib.version + '/build/pdf.worker.min.mjs'`. Reason: local Herd/nginx doesn't send `application/javascript` for `.mjs`, so self-hosting the worker fails with a MIME check. For production self-host, add `types { application/javascript mjs; }` to nginx.

**Scraper fetch credentials.** `fetchWithCorsFallback()` uses `credentials: 'same-origin'` for the `/api/scrape` call so Basic Auth (and later session cookies) flow through. **Do not** switch to `'omit'` — you'll get 401s when Basic Auth is on.

**Free-tier Render sleeps** after 15 min idle. First request cold-starts (~30 sec). If a scrape times out, wait and retry.

## Feature roadmap (in order)

1. **`CLAUDE.md` handoff → Claude Code** (this file lands, then switch)
2. **Vite migration.** Extract React source from `index.html` into proper module structure with `npm run build`. Keep classic runtime working through the transition. Uses standard React + Babel toolchain. Enables code splitting, TypeScript later, dev-server hot reload.
3. **Postgres + user accounts.**
   - Render's free Postgres tier is enough for internal testing
   - Suggested stack: `express-session` + `connect-pg-simple` + `bcrypt`
   - Endpoints: `POST /api/auth/register` (invite-only), `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
   - Register requires an invite token to prevent open signup
   - Sessions in signed HTTP-only cookies
4. **Server-side saved projects.** Migrate away from localStorage. Table `projects` with `owner_user_id`. Existing localStorage data can auto-migrate on first login.
5. **Per-user project ACL + sharing.** Owner + optional collaborators. Read vs edit permissions. Simple share-by-link with token as first cut.
6. **Move category system to CMS-driven.** Currently hardcoded default `General`. Long-term, categories come from the WBR CMS per event.

## Local dev

```bash
npm install
npm start
open http://localhost:3000
```

With Basic Auth on:

```bash
BASIC_AUTH_USER=wbr BASIC_AUTH_PASS=wbr npm start
```

Test scraper directly:

```bash
curl 'http://localhost:3000/api/scrape?url=https%3A%2F%2Fetailbrand.wbresearch.com%2Fsponsors' | head -c 500
```

## Deploy

- `git push origin main` → both Render (Node) and GitHub Pages (static) rebuild
- Render: dashboard.render.com → project "Booth Manager" → environment "Production" → service `floorplan`
- Render env vars live in the dashboard; changes trigger a restart (no redeploy needed)
- GitHub Pages settings: repo Settings → Pages, source = `main` / (root)

## Env vars

| Var | Where | Purpose |
|---|---|---|
| `PORT` | Render (auto) | Server bind port |
| `BASIC_AUTH_USER` | Render | Optional Basic Auth on page HTML |
| `BASIC_AUTH_PASS` | Render | Optional Basic Auth on page HTML |
| `DATABASE_URL` | (coming) | Postgres connection string |
| `SESSION_SECRET` | (coming) | express-session signing key |

## Directory structure (current)

```
/
├── index.html          # Entire SPA
├── server.js           # Express: /api/scrape, static, Basic Auth
├── package.json
├── README.md
└── CLAUDE.md           # This file
```

After Vite migration will look more like:

```
/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── stores/
│   ├── components/
│   │   ├── admin/
│   │   ├── user/
│   │   └── public/
│   └── utils/
├── server/
│   ├── index.js
│   ├── routes/
│   ├── middleware/
│   ├── db/
│   │   └── migrations/
│   └── auth/
├── public/
├── package.json
└── CLAUDE.md
```

## Contact + decisions log

- Basic Auth `wbr/wbr` is a placeholder from ops setup; will be removed when real auth lands
- Origin repo lived in an internal Herd Laravel/Vue prototype (`~/Herd/booth-selector`); React SPA is the direction going forward
- If you need to see historical rationale, the original design conversations are in Claude Cowork sessions on Mark's Mac; ask for specific decisions rather than trying to rehydrate the whole history

## Commands cheat sheet

```bash
npm start                            # local dev on :3000
npm install                          # after pulling
git push origin main                 # deploys to Render + GH Pages
gh browse                            # open repo in browser
gh run watch                         # watch Actions
curl localhost:3000/healthz          # server health
```
