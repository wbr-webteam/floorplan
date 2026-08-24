import { useState } from 'react';
import { useStore } from '../../stores/StoreContext.jsx';

export function SavedProjectsList() {
  const store = useStore();
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  if (!store.projects.length) return null;
  const sorted = [...store.projects].sort((a, b) =>
    (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  const fmtDate = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  return (
    <div className="max-w-2xl w-full bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Or load a saved project</h3>
        <span className="text-xs text-gray-500 ml-auto">
          {store.projects.length} saved in this browser
        </span>
      </div>
      <div className="divide-y divide-gray-100 max-h-80 overflow-auto scroll-thin">
        {sorted.map(p => (
          <div key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
            <div className="flex-1 min-w-0">
              {renamingId === p.id ? (
                <input
                  autoFocus value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => { store.renameProject(p.id, renameValue); setRenamingId(null); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { store.renameProject(p.id, renameValue); setRenamingId(null); }
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
              ) : (
                <div className="text-sm text-gray-900 truncate">{p.name}</div>
              )}
              <div className="text-xs text-gray-500 mt-0.5">
                {p.data?.booths?.length ?? 0} booths · {p.data?.sponsors?.length ?? 0} sponsors · updated {fmtDate(p.updatedAt)}
              </div>
            </div>
            <button onClick={() => store.loadProject(p.id)}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
              Open
            </button>
            <button onClick={() => { setRenamingId(p.id); setRenameValue(p.name); }}
                    className="text-xs px-2 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50" title="Rename">
              ✎
            </button>
            <button onClick={() => confirm(`Delete "${p.name}"? This can't be undone.`) && store.deleteProject(p.id)}
                    className="text-xs px-2 py-1.5 border border-red-200 text-red-600 rounded hover:bg-red-50" title="Delete">
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
