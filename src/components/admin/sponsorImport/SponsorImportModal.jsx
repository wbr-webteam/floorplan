import { useState } from 'react';
import { useStore } from '../../../stores/StoreContext.jsx';
import { Modal } from '../../shared/Modal.jsx';
import { findSponsorArray, mapImportedSponsors } from './sponsorMapping.js';
import { parseSponsorsFromHtml } from './parseSponsorsFromHtml.js';
import { fetchWithCorsFallback } from './fetchWithCorsFallback.js';

export function SponsorImportModal({ onClose }) {
  const store = useStore();
  // Default tab is "Website URL" — the most reliable path since the server-side
  // proxy handles CORS. API/paste tabs remain for CMS integrations later.
  const [tab, setTab] = useState('siteUrl'); // 'siteUrl' | 'siteHtml' | 'url' | 'paste'
  const [url, setUrl] = useState('https://api.iqpc.com/api/v2/event/6879132f670da3225a72b4e2/sponsors?modified_date=2026-05-17T18:19:35');
  const [headers, setHeaders] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [siteUrl, setSiteUrl] = useState('https://etailbrand.wbresearch.com/sponsors');
  const [siteHtml, setSiteHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); // {mapped, raw}

  const parseHeaders = () => {
    // Lines like "Authorization: Bearer xxx"
    const out = {};
    headers.split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([^:]+):\s*(.+)\s*$/);
      if (m) out[m[1].trim()] = m[2].trim();
    });
    return out;
  };

  const runFetch = async () => {
    setLoading(true); setError(''); setPreview(null);
    try {
      const res = await fetch(url, { headers: parseHeaders(), credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const body = await res.json();
      handleParsed(body);
    } catch (e) {
      let msg = e.message || String(e);
      if (/Failed to fetch|NetworkError|CORS/i.test(msg)) {
        msg += ' — the API likely doesn\'t send CORS headers for browser requests. Try pasting the JSON response directly in the "Paste JSON" tab.';
      }
      setError(msg);
    } finally { setLoading(false); }
  };

  const runParsePaste = () => {
    setError(''); setPreview(null);
    try {
      const body = JSON.parse(pasteText);
      handleParsed(body);
    } catch (e) {
      setError('Could not parse JSON: ' + (e.message || String(e)));
    }
  };

  const handleParsed = (body) => {
    const arr = findSponsorArray(body);
    if (!arr) {
      setError('Could not find a sponsor array in the response. Expected top-level array, or a { data | sponsors | items | results } wrapper.');
      return;
    }
    const mapped = mapImportedSponsors(arr, store.levels);
    setPreview({ mapped, raw: arr });
  };

  // Convert scraped {name, logoUrl, website, description} entries into our
  // sponsor model. Reuses the JSON mapper for consistent shape.
  const handleScraped = (scraped) => {
    if (!scraped.length) {
      setError('No sponsor blocks were found in the HTML. If the page uses uncommon markup, try Paste HTML mode and confirm the source contains repeated sponsor cards, or send me the URL and I\'ll tune the selectors.');
      return;
    }
    const mapped = mapImportedSponsors(scraped, store.levels);
    setPreview({ mapped, raw: scraped });
  };

  const runScrapeUrl = async () => {
    setLoading(true); setError(''); setPreview(null);
    try {
      const html = await fetchWithCorsFallback(siteUrl);
      handleScraped(parseSponsorsFromHtml(html, siteUrl));
    } catch (e) {
      setError(
        (e.message || String(e)) +
        ' — the page likely blocks browser-side requests and no public CORS proxy responded. Copy the page source (right-click → View Page Source, Cmd+A, Cmd+C) and use Paste HTML instead.'
      );
    } finally { setLoading(false); }
  };
  const runParseHtml = () => {
    setError(''); setPreview(null);
    handleScraped(parseSponsorsFromHtml(siteHtml, siteUrl));
  };

  const doImport = () => {
    if (!preview) return;
    if (!confirm(`Replace all ${store.sponsors.length} sponsors with ${preview.mapped.length} imported sponsors? Any existing booth assignments to sponsors that don't match will be cleared.`)) return;
    store.replaceSponsors(preview.mapped);
    onClose();
  };

  return (
    <Modal onClose={onClose} size="xl">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Import sponsors</h3>
        <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
      </div>

      <div className="px-5 py-3 border-b border-gray-100">
        <div className="inline-flex rounded overflow-hidden border border-gray-300 text-xs flex-wrap">
          <button onClick={() => setTab('siteUrl')}
                  className={`px-3 py-1 ${tab === 'siteUrl' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}>
            Website URL
          </button>
          <button onClick={() => setTab('siteHtml')}
                  className={`px-3 py-1 ${tab === 'siteHtml' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}>
            Paste HTML
          </button>
          <button onClick={() => setTab('url')}
                  className={`px-3 py-1 ${tab === 'url' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}>
            API URL
          </button>
          <button onClick={() => setTab('paste')}
                  className={`px-3 py-1 ${tab === 'paste' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}>
            Paste JSON
          </button>
        </div>
      </div>

      {tab === 'url' && (
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-gray-600 block">API URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)}
                   className="w-full text-sm border border-gray-300 rounded px-2 py-1 font-mono" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block">
              Headers (optional, one per line, e.g. <code>Authorization: Bearer …</code>)
            </label>
            <textarea value={headers} onChange={(e) => setHeaders(e.target.value)} rows={2}
                      placeholder="Authorization: Bearer <token>"
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-mono" />
          </div>
          <button onClick={runFetch} disabled={loading || !url}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40">
            {loading ? 'Fetching…' : 'Fetch and preview'}
          </button>
          <div className="text-xs text-gray-500">
            Browser-side fetch will only work if the API responds with CORS headers permitting your origin.
            For servers that don't (most private APIs), use the <em>Paste JSON</em> tab.
          </div>
        </div>
      )}

      {tab === 'paste' && (
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-gray-600 block">Paste JSON response</label>
            <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={10}
                      placeholder='[{"name":"Acme","logoUrl":"https://…","website":"https://…"}, …]'
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-mono" />
          </div>
          <button onClick={runParsePaste} disabled={!pasteText.trim()}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40">
            Parse and preview
          </button>
        </div>
      )}

      {tab === 'siteUrl' && (
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-gray-600 block">Sponsors page URL</label>
            <input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)}
                   className="w-full text-sm border border-gray-300 rounded px-2 py-1 font-mono" />
          </div>
          <button onClick={runScrapeUrl} disabled={loading || !siteUrl}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40">
            {loading ? 'Scraping…' : 'Fetch page & scrape sponsors'}
          </button>
          <div className="text-xs text-gray-500">
            We try a direct fetch first, then fall back to a public CORS proxy (allorigins.win / corsproxy.io).
            Public event pages usually work — pages behind auth or with strict CSP won't. If both fail, use <em>Paste HTML</em>.
          </div>
        </div>
      )}

      {tab === 'siteHtml' && (
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-gray-600 block">
              Source page URL <span className="text-gray-400">(used to resolve relative logo / link URLs)</span>
            </label>
            <input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)}
                   className="w-full text-sm border border-gray-300 rounded px-2 py-1 font-mono" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block">Paste full page HTML source</label>
            <textarea value={siteHtml} onChange={(e) => setSiteHtml(e.target.value)} rows={10}
                      placeholder="Right-click the sponsors page → View Page Source → Cmd+A, Cmd+C → paste here"
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-mono" />
          </div>
          <button onClick={runParseHtml} disabled={!siteHtml.trim()}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40">
            Parse HTML & preview
          </button>
          <div className="text-xs text-gray-500">
            Parser looks for repeated sponsor cards using common event-page selectors
            (<code>.sponsor</code>, <code>.exhibitor</code>, <code>[class*=&quot;sponsor&quot;]</code>, <code>.card</code>, <code>article</code>, etc.),
            then extracts name (heading), logo (<code>&lt;img&gt;</code>), and website link from each.
          </div>
        </div>
      )}

      {error && <div className="mx-5 mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>}

      {preview && (
        <div className="px-5 pb-4">
          <div className="text-sm mb-2">
            Detected <strong>{preview.mapped.length}</strong> sponsors. Preview (first 5):
          </div>
          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-2 py-1">Logo</th>
                  <th className="text-left px-2 py-1">Name</th>
                  <th className="text-left px-2 py-1">Category</th>
                  <th className="text-left px-2 py-1">Website</th>
                  <th className="text-left px-2 py-1">Double?</th>
                </tr>
              </thead>
              <tbody>
                {preview.mapped.slice(0, 5).map(sp => (
                  <tr key={sp.id} className="border-t border-gray-100">
                    <td className="px-2 py-1">
                      {sp.logoUrl ? <img src={sp.logoUrl} alt="" className="w-6 h-6 rounded-full" /> : '—'}
                    </td>
                    <td className="px-2 py-1">{sp.name}</td>
                    <td className="px-2 py-1">{store.levelById[sp.levelId]?.name || '—'}</td>
                    <td className="px-2 py-1 truncate max-w-[180px]">
                      {sp.website ? <a href={sp.website} target="_blank" rel="noopener" className="text-blue-600 hover:underline">{sp.website}</a> : '—'}
                    </td>
                    <td className="px-2 py-1">{sp.isDoubleBooth ? '✓' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Field mapping is auto-detected across common names
            (<code>name/companyName/title</code>, <code>logo/logoUrl/image</code>,
            <code>website/url/homepage</code>, <code>isDoubleBooth/doubleBooth</code>,
            <code>level/category/tier</code>). Anything that doesn't map cleanly falls back to sensible defaults.
          </div>
        </div>
      )}

      <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
        <button onClick={doImport} disabled={!preview}
                className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-40">
          Import {preview ? `${preview.mapped.length} sponsors` : ''}
        </button>
      </div>
    </Modal>
  );
}
