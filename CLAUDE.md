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

Vite-built React SPA (migrated from a single-file index.html + in-browser Babel — see git history before the `vite-migration` branch merge if you need the old version):

- `src/` — the React app as ES modules. See "Directory structure" below.
- `index.html` — Vite entry point. Just `<div id="root">` + `<script type="module" src="/src/main.jsx">`, plus the Tailwind/pdf.js/Tesseract.js `<script>` CDN tags (those three stay CDN globals, not npm-bundled — see notes below) and the global `<style>` block.
- `server.js` — Express server. Serves the **built** app from `dist/` (run `npm run build` first), provides `/api/scrape` HTML-proxy endpoint (bypass CORS for the WBR sponsor-page scraper).
- `vite.config.mjs` — `base: './'` (relative), so the same build works under Render's root domain and GitHub Pages' `/floorplan/` subpath.
- `package.json` — `express`, `react`/`react-dom` (pinned to 18.x to match pre-migration behavior), `vite` + `@vitejs/plugin-react` (dev deps).

No lint, no tests yet. `npm run build` builds to `dist/`; `npm start` runs `node server.js` (serves `dist/`); `npm run dev` runs the Vite dev server directly against `src/`.

## Critical implementation notes

**Babel classic runtime note is now historical.** Pre-Vite, JSX was transpiled in-browser by `@babel/standalone` and had to be forced to the classic runtime to avoid a blank-page failure. Post-migration, `@vitejs/plugin-react` compiles JSX at build time (esbuild) and resolves `react/jsx-runtime` through node_modules normally — this concern doesn't apply anymore, no special runtime config needed in `vite.config.mjs`.

**State shape.** `useStoreProvider()` custom hook holds all state; distributed via React Context. Reads via `useStore()`. The store contains: `role`, `floorPlan`, `booths`, `levels`, `sponsors`, `settings`, `activeSponsorId`, `projects`, `currentProjectId`. Actions mutate through setters returned by the hook.

**Everything is in-memory** except saved projects. Projects persist to `localStorage` under key `booth-selector-v2-projects`. When user accounts land, this needs to move server-side.

**Category = level internally.** The rename from "level" to "category" was UI-only. Variables, IDs, and field names still use `level` / `levelId` / `boothsAtLevel`. Don't rename these mechanically — it churns the diff for no benefit.

**Sponsor import — 4 paths.** Website URL (default; uses `/api/scrape`), Paste HTML, API URL (JSON), Paste JSON. Field mapping is flexible — see `findSponsorArray` and `pickField` for name-variant handling (`name` / `companyName` / `title`, `logo` / `logoUrl` / `image`, etc.).

**OCR.** Tesseract.js from CDN. `buildOcrCanvas` upscales the cropped booth region to at least 160 px short side, then Otsu-binarizes — small booth labels wouldn't OCR without this. PSM 7 first, retry PSM 6 if empty. Fallback labels (`A1`, `B2`, …) for unreadable booths.

**pdf.js worker.** `src/utils/pdf.js` pins `pdfjsLib.GlobalWorkerOptions.workerSrc` to the same cdnjs pdf.js version as the `<script>` tag in `index.html` (currently `3.11.174`) — keep both in sync if you bump the pdf.js version. Loaded from CDN, not npm-bundled (see Architecture above).

**Scraper fetch credentials.** `fetchWithCorsFallback()` uses `credentials: 'same-origin'` for the `/api/scrape` call so Basic Auth (and later session cookies) flow through. **Do not** switch to `'omit'` — you'll get 401s when Basic Auth is on.

**Free-tier Render sleeps** after 15 min idle. First request cold-starts (~30 sec). If a scrape times out, wait and retry.

## Feature roadmap (in order)

1. ~~**`CLAUDE.md` handoff → Claude Code**~~ done
2. ~~**Vite migration.**~~ done — see "Architecture" above. Extraction was verified section-by-section against the original `index.html` (byte-diff + esbuild bundle check per section) plus a live browser smoke test (upload → detect → OCR → admin assign → Sponsor/Public views) before cutover.
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

For frontend-only work with hot reload (no Express, no Basic Auth, no /api/scrape):

```bash
npm install
npm run dev
open http://localhost:5173
```

To run the real production path (build + Express server, matches Render):

```bash
npm install
npm run build
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

- `git push origin main` → both Render (Node) and GitHub Pages rebuild
- Render: dashboard.render.com → project "Booth Manager" → environment "Production" → service `floorplan`
  - **Build Command must be `npm install && npm run build`** (post-Vite-migration; it used to be just an install with no build step)
  - Start Command stays `npm start` (`node server.js`, serving `dist/`)
  - Render env vars live in the dashboard; changes trigger a restart (no redeploy needed)
- GitHub Pages: repo Settings → Pages → source = **GitHub Actions** (changed from "Deploy from a branch" during the Vite migration — Pages can't serve the Vite dev-mode `index.html` directly, it needs the built `dist/`). The workflow is `.github/workflows/deploy-pages.yml`, triggered on push to `main`.

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
├── index.html                    # Vite entry (mount point + CDN <script> tags)
├── vite.config.mjs               # base: './' for Render root + GH Pages subpath
├── src/
│   ├── main.jsx                  # createRoot().render(<App />)
│   ├── App.jsx                   # AppInner (role switch) + App (StoreContext.Provider)
│   ├── stores/
│   │   └── StoreContext.jsx      # useStoreProvider, useStore, localStorage projects
│   ├── components/
│   │   ├── shared/                # TopBar, Modal, SaveProjectModal
│   │   ├── upload/                 # UploadStep, ScanRegionSelector, SavedProjectsList, loadImage
│   │   ├── admin/                  # AdminView + sidebar/canvas/modals, sponsorImport/
│   │   ├── user/                   # UserView + BoothActionCard and related modals
│   │   └── public/                 # PublicView (attendee read-only)
│   └── utils/                    # uid, color, pdf, boothDetection, ocr, sampleData, adjacency
├── server.js                     # Express: serves dist/, /api/scrape, Basic Auth
├── package.json
├── .github/workflows/deploy-pages.yml   # builds + publishes dist/ to GitHub Pages
├── README.md
└── CLAUDE.md                     # This file
```

The `server/` (routes/middleware/db/auth) split sketched in earlier drafts of this file hasn't happened yet — that's part of the Postgres/accounts step below, not this one.

## Contact + decisions log

- Basic Auth `wbr/wbr` is a placeholder from ops setup; will be removed when real auth lands
- Origin repo lived in an internal Herd Laravel/Vue prototype (`~/Herd/booth-selector`); React SPA is the direction going forward
- If you need to see historical rationale, the original design conversations are in Claude Cowork sessions on Mark's Mac; ask for specific decisions rather than trying to rehydrate the whole history

## Commands cheat sheet

```bash
npm install                          # after pulling
npm run dev                          # hot-reload dev server on :5173 (no Express)
npm run build                        # build to dist/
npm start                            # serve dist/ via Express on :3000 (build first)
git push origin main                 # deploys to Render + GH Pages
gh browse                            # open repo in browser
gh run watch                         # watch Actions
curl localhost:3000/healthz          # server health
```
