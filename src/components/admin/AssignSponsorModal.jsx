import { useState } from 'react';
import { useStore } from '../../stores/StoreContext.jsx';
import { findAdjacentEmpty } from '../../utils/adjacency.js';
import { Modal } from '../shared/Modal.jsx';

export function AssignSponsorModal({ booth, onClose }) {
  const store = useStore();
  const [error, setError] = useState('');
  const level = store.levelById[booth.levelId];
  const candidates = store.unassignedSponsorsAtLevel(booth.levelId);

  const onAssign = (sp) => {
    if (sp.isDoubleBooth) {
      const partner = findAdjacentEmpty(booth, store.booths);
      if (!partner) {
        setError(`${sp.name} requires a double booth, but no adjacent empty same-category booth was found. Pick a different booth first.`);
        return;
      }
    }
    store.assignSponsor(booth.id, sp.id);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: level?.color }} />
          <span className="text-xs uppercase tracking-wide text-gray-500">{level?.name}</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mt-1">Assign sponsor to booth {booth.label}</h3>
      </div>
      {error && <div className="mx-5 mt-3 p-3 rounded bg-amber-50 border border-amber-200 text-sm text-amber-800">{error}</div>}
      <div className="max-h-[50vh] overflow-y-auto scroll-thin">
        {candidates.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            No unassigned sponsors at <strong>{level?.name}</strong>.
          </div>
        )}
        {candidates.map(sp => (
          <button key={sp.id} onClick={() => onAssign(sp)}
                  className="w-full text-left px-5 py-3 border-b border-gray-100 hover:bg-blue-50 flex items-center gap-3">
            {store.settings.showSponsorLogos && sp.logoUrl && (
              <img src={sp.logoUrl} alt="" className="w-8 h-8 rounded-full" />
            )}
            <span className="flex-1 text-sm text-gray-900">{sp.name}</span>
            {sp.isDoubleBooth && (
              <span className="text-[10px] uppercase font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                Needs 2 adj.
              </span>
            )}
            <span className="text-xs text-blue-600">Assign →</span>
          </button>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
      </div>
    </Modal>
  );
}
