import { uid } from './uid.js';

// -------- Sample data --------
export const DEFAULT_LEVELS = [
  { id: 'general', name: 'General', color: '#3B82F6' },
];
// All demo sponsors default to the General category. Admin can add more
// categories from the sidebar; sponsors' categories are editable from tinker
// or a future admin UI. Booleans below flag the double-booth sponsors.
const SAMPLE_COMPANIES = [
  ['Acme Industries',    'general', true ],
  ['Bridgepoint Labs',   'general', false],
  ['Cascade Logistics',  'general', false],
  ['Delta Bioworks',     'general', true ],
  ['Evergreen Robotics', 'general', false],
  ['Fortis Materials',   'general', false],
  ['Globex Pharma',      'general', false],
  ['Helios Energy',      'general', false],
  ['Initech Software',   'general', false],
  ['Jovian Aerospace',   'general', false],
  ['Kestrel Networks',   'general', false],
  ['Lumen Optics',       'general', false],
  ['Meridian Health',    'general', true ],
  ['Nimbus Cloud',       'general', false],
  ['Orion Diagnostics',  'general', false],
  ['Pinnacle Foods',     'general', false],
  ['Quanta Sensors',     'general', false],
  ['Rivendell Wines',    'general', false],
  ['Stratos Medical',    'general', false],
  ['Trident Capital',    'general', false],
  ['Umbra Security',     'general', false],
  ['Vector Mobility',    'general', false],
];

export function generateSampleSponsors(levels) {
  const byName = Object.fromEntries(levels.map(l => [l.name.toLowerCase(), l]));
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return SAMPLE_COMPANIES.map(([name, lvlKey, isDouble], i) => {
    const level = byName[lvlKey] || levels[levels.length - 1];
    return {
      id: uid(),
      name,
      levelId: level.id,
      isDoubleBooth: isDouble,
      position: i,
      logoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${level.color.slice(1)}&color=fff&size=128&font-size=0.4&bold=true&rounded=true`,
      // Placeholder company URL. In production these come from your CMS/API.
      website: `https://www.${slug(name)}.example`,
    };
  });
}
