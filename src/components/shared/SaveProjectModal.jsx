import { useState } from 'react';
import { useStore } from '../../stores/StoreContext.jsx';
import { Modal } from './Modal.jsx';

export function SaveProjectModal({ onClose }) {
  const store = useStore();
  const currentProject = store.currentProjectId
    ? store.projects.find(p => p.id === store.currentProjectId) : null;
  const [name, setName] = useState(currentProject?.name || 'Untitled project');
  const [mode, setMode] = useState(currentProject ? 'overwrite' : 'new'); // 'overwrite' | 'new'

  const handleSave = () => {
    if (mode === 'overwrite' && currentProject) {
      store.saveCurrentAsProject(name, currentProject.id);
    } else {
      store.saveCurrentAsProject(name);
    }
    onClose();
  };

  return (
    <Modal onClose={onClose} size="sm">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Save project</h3>
        <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div>
          <label className="text-xs text-gray-600 block">Project name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
                 className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
        </div>
        {currentProject && (
          <div className="text-xs">
            <label className="flex items-center gap-2 cursor-pointer py-0.5">
              <input type="radio" checked={mode === 'overwrite'} onChange={() => setMode('overwrite')} />
              Overwrite <strong>{currentProject.name}</strong>
            </label>
            <label className="flex items-center gap-2 cursor-pointer py-0.5">
              <input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} />
              Save as a new project
            </label>
          </div>
        )}
        <div className="text-xs text-gray-500">
          Projects are stored in this browser's local storage — they persist across reloads but are visible only on this device.
        </div>
      </div>
      <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
        <button onClick={handleSave} disabled={!name.trim()}
                className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-40">
          Save
        </button>
      </div>
    </Modal>
  );
}
