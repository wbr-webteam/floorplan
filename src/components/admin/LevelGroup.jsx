import { useState } from 'react';
import { useStore } from '../../stores/StoreContext.jsx';
import { SponsorRow } from './SponsorRow.jsx';

export function LevelGroup({ level, mode, onOpenAssign, selectedBoothId, setSelectedBoothId }) {
  const store = useStore();
  const [flipped, setFlipped] = useState(false);
  const [expandedBoothId, setExpandedBoothId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const boothsHere = store.boothsAtLevel(level.id);
  const sponsorsHere = store.sponsorsAtLevel(level.id);
  const unassignedCount = store.unassignedSponsorsAtLevel(level.id).length;

  const onDragStart = (e, sp) => { setDragId(sp.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', sp.id); };
  const onDragOver = (sp) => { if (dragId) setDragOverId(sp.id); };
  const onDrop = () => {
    if (!dragId || !dragOverId || dragId === dragOverId) return;
    const ids = sponsorsHere.map(s => s.id);
    const from = ids.indexOf(dragId), to = ids.indexOf(dragOverId);
    if (from === -1 || to === -1) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    store.reorderSponsors(level.id, ids);
    setDragId(null); setDragOverId(null);
  };
  const onDragEnd = () => { setDragId(null); setDragOverId(null); };

  return (
    <div className="border-b border-gray-100">
      <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
        <input type="color" value={level.color}
               onChange={(e) => store.updateLevel(level.id, { color: e.target.value })}
               className="w-6 h-6 rounded border border-gray-300 cursor-pointer" />
        <input value={level.name}
               onChange={(e) => store.updateLevel(level.id, { name: e.target.value })}
               className="flex-1 bg-transparent text-sm font-semibold text-gray-900 focus:outline-none focus:bg-white px-1 rounded" />
        <span className="text-xs text-gray-500">{flipped ? unassignedCount : boothsHere.length}</span>
        {store.levels.length > 1 && (
          <button onClick={() => confirm(`Delete category "${level.name}"? Booths and sponsors in this category will move to another category.`) && store.deleteLevel(level.id)}
                  className="text-gray-300 hover:text-red-600 text-xs">×</button>
        )}
      </div>
      <div className="px-4 py-2">
        <button onClick={() => setFlipped(f => !f)}
                className="text-xs text-blue-600 hover:underline mb-2 flex items-center gap-1">
          {flipped ? '← View Booths' : `View Unassigned (${unassignedCount}) →`}
          {store.settings.enforceSelectionOrder && flipped && (
            <span className="ml-auto text-[10px] font-semibold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded">↕ Order</span>
          )}
        </button>

        {!flipped && (
          <div className="space-y-1">
            {boothsHere.length === 0 && (
              <div className="text-xs text-gray-400 italic py-1">No booths in this category.</div>
            )}
            {boothsHere.map(b => {
              const sponsor = b.sponsorId ? store.sponsorById[b.sponsorId] : null;
              const expanded = expandedBoothId === b.id;
              return (
                <div key={b.id} className={`rounded border text-sm ${selectedBoothId === b.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                  <div className="px-2 py-1.5 cursor-pointer flex items-center gap-2"
                       onClick={() => { setSelectedBoothId(b.id); setExpandedBoothId(expanded ? null : b.id); }}>
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: level.color }} />
                    <input value={b.label}
                           onClick={(e) => e.stopPropagation()}
                           onChange={(e) => store.updateBooth(b.id, { label: e.target.value })}
                           className="font-mono text-xs w-16 px-1 py-0.5 rounded bg-gray-50 focus:bg-white border border-transparent focus:border-gray-300" />
                    <span className="text-xs text-gray-600 flex-1 truncate flex items-center gap-1">
                      {sponsor ? (
                        <>
                          {store.settings.showSponsorLogos && sponsor.logoUrl && (
                            <img src={sponsor.logoUrl} alt="" className="w-4 h-4 rounded-full" />
                          )}
                          {sponsor.name}
                          {sponsor.isDoubleBooth && (
                            <span className="text-[9px] uppercase font-semibold text-amber-700 bg-amber-100 px-1 py-0.5 rounded">2×</span>
                          )}
                        </>
                      ) : <em className="text-gray-400">unassigned</em>}
                    </span>
                    {b.locked && <span title="Locked" className="text-amber-600 text-xs">🔒</span>}
                  </div>
                  {expanded && (
                    <div className="px-2 pb-2 space-y-1.5">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <span>Category:</span>
                        <select value={b.levelId}
                                onChange={(e) => store.updateBooth(b.id, { levelId: e.target.value })}
                                className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5">
                          {store.levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => onOpenAssign(b)}
                                className="text-xs px-2 py-1 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
                          {b.sponsorId ? 'Reassign' : 'Assign'}
                        </button>
                        {b.sponsorId && (
                          <button onClick={() => store.unassignBooth(b.id)}
                                  className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">
                            Unassign
                          </button>
                        )}
                        <button onClick={() => { if (confirm(`Delete booth ${b.label}?`)) { store.deleteBooth(b.id); setExpandedBoothId(null); } }}
                                className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 ml-auto">
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {flipped && (
          <div className="space-y-1">
            {sponsorsHere.length === 0 && (
              <div className="text-xs text-gray-400 italic py-1">No sponsors in this category.</div>
            )}
            {sponsorsHere.map((sp, i) => (
              <SponsorRow key={sp.id} sponsor={sp} index={i} level={level}
                          reorderable={store.settings.enforceSelectionOrder}
                          dragging={dragId === sp.id} dragOver={dragOverId === sp.id}
                          onDragStart={onDragStart} onDragOver={onDragOver}
                          onDrop={onDrop} onDragEnd={onDragEnd} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
