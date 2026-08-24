import { useState } from 'react';
import { useStore } from '../../stores/StoreContext.jsx';
import { LevelGroup } from './LevelGroup.jsx';

export function AdminSidebar({ mode, setMode, onOpenAssign, onReupload, onReDetect, onImportSponsors, selectedBoothId, setSelectedBoothId }) {
  const store = useStore();
  const [collapsed, setCollapsed] = useState(false);
  if (collapsed) {
    return (
      <div className="bg-white border-r border-gray-200 p-2 flex flex-col items-center gap-2 flex-shrink-0">
        <button onClick={() => setCollapsed(false)} className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center" title="Expand">›</button>
      </div>
    );
  }
  return (
    <div className="bg-white border-r border-gray-200 w-80 flex flex-col flex-shrink-0">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="font-semibold text-gray-900">Booths & Sponsors</div>
        <button onClick={() => setCollapsed(true)} className="text-gray-400 hover:text-gray-700">‹</button>
      </div>

      <div className="px-4 py-3 border-b border-gray-200 space-y-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setMode('select')}
                  className={`flex-1 text-xs py-1.5 rounded border ${mode==='select' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>
            Edit
          </button>
          <button onClick={() => setMode('edit')}
                  className={`flex-1 text-xs py-1.5 rounded border ${mode==='edit' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>
            Move/Resize
          </button>
          <button onClick={() => setMode('add')}
                  className={`flex-1 text-xs py-1.5 rounded border ${mode==='add' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>
            + Add
          </button>
        </div>
        <button onClick={onReupload} className="w-full text-xs py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50">
          ↻ Re-upload floor plan image
        </button>
        <button onClick={onReDetect} className="w-full text-xs py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50">
          ⌘ Re-run auto-detect
        </button>
        <button onClick={onImportSponsors} className="w-full text-xs py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50">
          ⇩ Import Sponsors
        </button>
        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
          <input type="checkbox" checked={store.settings.showAssignmentsToSponsors}
                 onChange={(e) => store.updateSettings({ showAssignmentsToSponsors: e.target.checked })} />
          Display booth assignments to sponsors
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
          <input type="checkbox" checked={store.settings.showSponsorLogos}
                 onChange={(e) => store.updateSettings({ showSponsorLogos: e.target.checked })} />
          Display sponsor logo images
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
          <input type="checkbox" checked={store.settings.enforceSelectionOrder}
                 onChange={(e) => store.updateSettings({ enforceSelectionOrder: e.target.checked })} />
          Restrict booth selection to predefined order
        </label>

        <div className="pt-2 mt-1 border-t border-gray-100">
          <div className="text-xs font-semibold text-gray-700 mb-1">Double booth orientation</div>
          {[
            ['vertical',    'Vertical only'],
            ['horizontal',  'Horizontal only'],
            ['user-toggle', 'User can toggle'],
          ].map(([val, label]) => (
            <label key={val} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer py-0.5">
              <input type="radio" name="dbo"
                     checked={store.settings.doubleBoothOrientation === val}
                     onChange={() => store.updateSettings({ doubleBoothOrientation: val })} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        {store.levels.map(level => (
          <LevelGroup key={level.id} level={level} mode={mode}
                      onOpenAssign={onOpenAssign}
                      selectedBoothId={selectedBoothId} setSelectedBoothId={setSelectedBoothId} />
        ))}
        <div className="px-4 py-3">
          <button onClick={store.createLevel}
                  className="w-full text-xs py-1.5 border border-dashed border-gray-300 rounded text-gray-500 hover:bg-gray-50">
            + Add Category
          </button>
        </div>
      </div>
    </div>
  );
}
