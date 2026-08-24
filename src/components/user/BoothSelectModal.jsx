import { useStore } from '../../stores/StoreContext.jsx';
import { Modal } from '../shared/Modal.jsx';

export function BoothSelectModal({ booth, partner, showOrientationToggle, orientation, onSetOrientation, onCancel, onSelect }) {
  const store = useStore();
  return (
    <Modal onClose={onCancel}>
      <div className="px-5 py-4 border-b flex items-center gap-2">
        <h3 className="text-lg font-semibold">Booth {booth.label}</h3>
        <button onClick={onCancel} className="ml-auto text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm mb-2">You are about to select this booth as <strong>{store.sponsorById[store.activeSponsorId]?.name}</strong>.</p>
        {partner && (
          <div className="mt-2 p-3 rounded bg-blue-50 border border-blue-200 text-sm">
            <div>
              ⊞ Because you have a <strong>double booth</strong> reservation, this will also reserve the {orientation === 'horizontal' ? 'horizontally' : 'vertically'} adjacent booth <strong>{partner.label}</strong>.
            </div>
            {showOrientationToggle && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-600">Orientation:</span>
                <div className="inline-flex rounded overflow-hidden border border-blue-300">
                  <button onClick={() => onSetOrientation('vertical')}
                          className={`px-3 py-1 text-xs ${orientation === 'vertical' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'}`}>
                    Vertical
                  </button>
                  <button onClick={() => onSetOrientation('horizontal')}
                          className={`px-3 py-1 text-xs ${orientation === 'horizontal' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'}`}>
                    Horizontal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-t flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">Cancel</button>
        <button onClick={onSelect} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded">Select this Booth</button>
      </div>
    </Modal>
  );
}
