import { useStore } from '../../stores/StoreContext.jsx';

export function SponsorRow({ sponsor, index, level, reorderable, onDragStart, onDragOver, onDrop, onDragEnd, dragging, dragOver }) {
  const store = useStore();
  const myBooth = store.booths.find(b => b.sponsorId === sponsor.id);
  return (
    <div className={`rounded border bg-white text-sm flex items-center gap-2 px-2 py-1.5
                     ${dragging ? 'opacity-40' : ''}
                     ${dragOver ? 'border-t-2 border-t-blue-500' : 'border-gray-200'}`}
         draggable={reorderable}
         onDragStart={(e) => onDragStart(e, sponsor)}
         onDragOver={(e) => { e.preventDefault(); onDragOver(sponsor); }}
         onDrop={(e) => { e.preventDefault(); onDrop(); }}
         onDragEnd={onDragEnd}>
      {reorderable && <span className="text-gray-400 cursor-grab" title="Drag to reorder">⋮⋮</span>}
      <span className="text-[10px] font-mono text-gray-500 w-5 text-center">{index + 1}</span>
      {store.settings.showSponsorLogos && sponsor.logoUrl && (
        <img src={sponsor.logoUrl} alt="" className="w-5 h-5 rounded-full" />
      )}
      <span className="flex-1 truncate">
        {sponsor.name}
        {sponsor.isDoubleBooth && (
          <span className="text-[9px] uppercase ml-1 font-semibold text-amber-700 bg-amber-100 px-1 py-0.5 rounded">2×</span>
        )}
      </span>
      {myBooth
        ? <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${myBooth.locked ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
            {myBooth.locked ? '🔒 ' : ''}{myBooth.label}
          </span>
        : <span className="text-[10px] text-gray-400 italic">unassigned</span>}
      <button onClick={() => store.updateSponsor(sponsor.id, { isDoubleBooth: !sponsor.isDoubleBooth })}
              className="text-gray-400 hover:text-amber-700 p-0.5"
              title={sponsor.isDoubleBooth ? 'Remove double-booth flag' : 'Mark as double-booth'}>
        {sponsor.isDoubleBooth ? '⊞' : '⊡'}
      </button>
    </div>
  );
}
