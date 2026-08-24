// -------- Sponsor import: parse arbitrary event-page HTML into sponsor cards --------
// Handles WBR-style sponsor pages and other common event-website layouts. Tries
// several selector strategies to locate repeated sponsor blocks, then extracts
// name / logo / website / description from each.
export function parseSponsorsFromHtml(htmlString, baseUrl) {
  const doc = new DOMParser().parseFromString(htmlString, 'text/html');
  const resolveUrl = (href) => {
    if (!href) return '';
    try { return new URL(href, baseUrl || doc.baseURI || 'https://example.com/').href; }
    catch { return href; }
  };

  // Strategy list — try selectors from most specific to broadest until we
  // find a set of at least 3 repeated blocks (arbitrary heuristic: below that
  // is probably navigation / decorative markup).
  const strategies = [
    '.sponsor, .sponsors > *',
    '.exhibitor, .exhibitors > *',
    '[class*="sponsor-card"]',
    '[class*="sponsor"]',
    '[class*="exhibitor"]',
    '[class*="partner"]',
    '.card',
    'article',
    '.item',
    '.grid > div',
    'li',
  ];
  let cards = [];
  for (const sel of strategies) {
    const found = Array.from(doc.querySelectorAll(sel))
      .filter(el => el.querySelector('img, a, h1, h2, h3, h4, h5, h6'));
    if (found.length >= 3) { cards = found; break; }
  }

  // Last-ditch: pair each heading with its nearest ancestor container.
  if (!cards.length) {
    const heads = Array.from(doc.querySelectorAll('h2, h3, h4'))
      .filter(h => h.textContent.trim() && !/read more|sponsors?|exhibitors?/i.test(h.textContent.trim()));
    cards = heads.map(h => h.closest('article, section, li, div') || h.parentElement).filter(Boolean);
    // De-dup — the .closest() often returns the same container for siblings
    cards = Array.from(new Set(cards));
  }

  const out = [];
  const seenNames = new Set();
  for (const card of cards) {
    // Name — first heading; else first prominent link text; else <strong>
    const nameEl = card.querySelector('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"]')
      || card.querySelector('a[href] strong, a[href] b')
      || card.querySelector('a[href]');
    let name = (nameEl?.textContent || '').trim().replace(/\s+/g, ' ');
    if (!name || /read more|learn more|view profile/i.test(name)) continue;
    if (name.length > 120) name = name.slice(0, 120);

    // Logo — prefer <img> with logo-ish class/alt; else first <img>
    const imgs = Array.from(card.querySelectorAll('img'));
    const logoImg = imgs.find(img => /logo|brand/i.test((img.className || '') + ' ' + (img.alt || ''))) || imgs[0];
    let logo = logoImg?.getAttribute('src') || logoImg?.getAttribute('data-src') || '';
    // Some sites lazy-load via srcset — take the first url
    if (!logo && logoImg?.getAttribute('srcset')) {
      logo = logoImg.getAttribute('srcset').split(',')[0].trim().split(' ')[0];
    }
    if (logo) logo = resolveUrl(logo);

    // Website / profile — prefer an external link; else the profile-page link
    const links = Array.from(card.querySelectorAll('a[href]'))
      .map(a => a.getAttribute('href'))
      .filter(Boolean);
    let external = links.find(h => /^https?:\/\//i.test(h) && !h.includes((baseUrl || '').replace(/^https?:\/\//, '').split('/')[0]));
    let internalProfile = links.find(h => /sponsor|exhibitor|profile|partner/i.test(h));
    const website = external ? resolveUrl(external) : (internalProfile ? resolveUrl(internalProfile) : (links[0] ? resolveUrl(links[0]) : ''));

    // Description — first paragraph text within the card, trimmed
    const descEl = card.querySelector('p, [class*="desc"], .summary');
    const description = descEl ? descEl.textContent.trim().replace(/\s+/g, ' ').slice(0, 500) : '';

    // Skip duplicates
    const key = name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    out.push({ name, logoUrl: logo, website, description });
  }
  return out;
}
