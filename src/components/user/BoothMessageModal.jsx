import { useStore } from '../../stores/StoreContext.jsx';
import { Modal } from '../shared/Modal.jsx';

export function BoothMessageModal({ title, body, sponsor, onClose }) {
  const store = useStore();
  return (
    <Modal onClose={onClose} size="sm" dim="rgba(0,0,0,0.3)">
      <div className="px-5 py-3 border-b flex items-center">
        <h6 className="font-semibold">{title}</h6>
        <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
      </div>
      <div className="px-5 py-3 text-sm">
        {sponsor && (
          <div className="flex items-center gap-2 mb-2">
            {store.settings.showSponsorLogos && sponsor.logoUrl && (
              <img src={sponsor.logoUrl} alt="" className="w-8 h-8 rounded-full" />
            )}
            <strong>{sponsor.name}</strong>
          </div>
        )}
        <div>{body}</div>
      </div>
      <div className="px-5 py-2 border-t flex justify-end">
        <button onClick={onClose} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded">Close</button>
      </div>
    </Modal>
  );
}
