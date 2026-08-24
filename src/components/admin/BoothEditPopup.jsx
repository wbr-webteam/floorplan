import { useState, useEffect } from 'react';
import { useStore } from '../../stores/StoreContext.jsx';
import { Modal } from '../shared/Modal.jsx';

export function BoothEditPopup({ booth, onClose, onOpenAssign }) {
  const store = useStore();
  const live = store.boothById[booth.id] || booth;
  const [label, setLabel] = useState(live.label);
  const [levelId, setLevelId] = useState(live.levelId);
  useEffect(() => { setLabel(live.label); setLevelId(live.levelId); }, [live.id, live.label, live.levelId]);
  const dirty = label !== live.label || levelId !== live.levelId;

  const sponsor = live.sponsorId ? store.sponsorById[live.sponsorId] : null;
  const partner = live.partnerBoothId ? store.boothById[live.partnerBoothId] : null;
  const level = store.levelById[live.levelId];

  return (
    <Modal onClose={onClose}>
      <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: level?.color }} />
        <h3 className="text-lg font-semibold text-gray-900">Booth {live.label}</h3>
        <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 block">Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)}
                   className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Category</label>
            <select value={levelId} onChange={(e) => setLevelId(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1">
              {store.levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>
        {sponsor && (
          <div className="p-3 rounded bg-gray-50 border border-gray-200">
            <div className="text-xs text-gray-500">Currently assigned</div>
            <div className="flex items-center gap-2 mt-1">
              {store.settings.showSponsorLogos && sponsor.logoUrl && (
                <img src={sponsor.logoUrl} alt="" className="w-8 h-8 rounded-full" />
              )}
              <strong className="text-sm">{sponsor.name}</strong>
              {sponsor.isDoubleBooth && (
                <span className="text-[10px] uppercase font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">2× double</span>
              )}
              {live.locked && <span className="ml-auto text-xs text-amber-600">🔒 locked</span>}
            </div>
            {partner && <div className="text-xs text-gray-500 mt-1">Paired with booth <code>{partner.label}</code></div>}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => onOpenAssign(live)}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            {live.sponsorId ? 'Reassign sponsor' : 'Assign sponsor'}
          </button>
          {live.sponsorId && (
            <button onClick={() => store.unassignBooth(live.id)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50">
              Unassign
            </button>
          )}
          <button onClick={() => { if (confirm(`Delete booth ${live.label}?`)) { store.deleteBooth(live.id); onClose(); } }}
                  className="ml-auto px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50">
            Delete booth
          </button>
        </div>
      </div>
      <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">Close</button>
        <button onClick={() => { store.updateBooth(live.id, { label, levelId }); onClose(); }}
                disabled={!dirty}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40">
          Save changes
        </button>
      </div>
    </Modal>
  );
}
