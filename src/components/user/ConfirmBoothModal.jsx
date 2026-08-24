import { Modal } from '../shared/Modal.jsx';

export function ConfirmBoothModal({ booth, partner, orientation, isDouble, onCancel, onConfirm }) {
  return (
    <Modal onClose={onCancel} dim="rgba(0,0,0,0.5)">
      <div className="px-5 py-4 border-b flex items-center gap-2">
        <h3 className="text-lg font-semibold">Are you sure?</h3>
        <button onClick={onCancel} className="ml-auto text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm">Once you select a booth, it will be locked in for your company. You will need to contact your meeting planner to request a change.</p>
        <div className="mt-2 text-sm text-gray-600">
          Booth: <strong>{booth.label}</strong>
          {partner && (
            <>
              {' '}+ <strong>{partner.label}</strong>{' '}
              <span className="text-xs uppercase font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded ml-1">
                Double {orientation === 'horizontal' ? '(H)' : '(V)'}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="px-5 py-3 border-t flex flex-col gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">Cancel — I want to keep looking</button>
        <button onClick={onConfirm} className="px-4 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded">Confirmed — this is my booth</button>
      </div>
    </Modal>
  );
}
