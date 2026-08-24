import { useState } from 'react';
import { useStore } from '../../stores/StoreContext.jsx';
import { SaveProjectModal } from './SaveProjectModal.jsx';

export function TopBar() {
  const store = useStore();
  const [saveOpen, setSaveOpen] = useState(false);
  const currentProject = store.currentProjectId
    ? store.projects.find(p => p.id === store.currentProjectId) : null;
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-bold">B</div>
        <div>
          <div className="font-semibold text-gray-900">
            Booth Selector v2
            {currentProject && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                · {currentProject.name}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">Exhibition Hall Floor Plan · React</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {store.floorPlan && store.role === 'admin' && (
          <button onClick={() => setSaveOpen(true)}
                  className="text-xs px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50">
            💾 Save project
          </button>
        )}
        {store.floorPlan && (
          <button onClick={() => confirm('Start over? This clears the floor plan and all assignments (the saved project, if any, is not deleted).') && store.startOver()}
                  className="text-xs text-gray-500 hover:text-gray-800 underline">
            Start over
          </button>
        )}
        {saveOpen && <SaveProjectModal onClose={() => setSaveOpen(false)} />}
        <div className="bg-gray-100 rounded-lg p-1 flex">
          <button onClick={() => store.setRole('admin')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${store.role === 'admin' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}>
            Admin
          </button>
          <button onClick={() => store.setRole('user')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${store.role === 'user' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}>
            Sponsor
          </button>
          <button onClick={() => store.setRole('public')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${store.role === 'public' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}>
            Public
          </button>
        </div>
      </div>
    </div>
  );
}
