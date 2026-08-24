import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../stores/StoreContext.jsx';

/**
 * Anchored, draggable action card used for the sponsor's Select→Confirm flow.
 * Positions itself next to the selected booth (right side by default, flips
 * to left / above / below if it would go off-screen) so the booth stays
 * visible. Header is a drag handle so the user can move it aside if needed.
 */
export function BoothActionCard({
  booth, partner, step,
  showOrientationToggle, orientation, onSetOrientation,
  onCancel, onSelect, onConfirm,
}) {
  const store = useStore();
  const [pos, setPos] = useState(null);
  const [dragging, setDragging] = useState(false);
  const cardRef = useRef(null);
  const CARD_W = 360;

  // Compute initial position based on the booth's on-screen bbox.
  useEffect(() => {
    const el = document.querySelector(`[data-booth-id="${booth.id}"] rect.booth-rect`);
    const cardH = 260;
    if (!el) {
      setPos({ x: window.innerWidth - CARD_W - 24, y: 80 });
      return;
    }
    const rect = el.getBoundingClientRect();
    const partnerEl = partner
      ? document.querySelector(`[data-booth-id="${partner.id}"] rect.booth-rect`)
      : null;
    // Combined bounding box (booth + partner) so we can avoid both.
    let union = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    if (partnerEl) {
      const p = partnerEl.getBoundingClientRect();
      union = {
        left:   Math.min(union.left, p.left),
        right:  Math.max(union.right, p.right),
        top:    Math.min(union.top, p.top),
        bottom: Math.max(union.bottom, p.bottom),
      };
    }
    const gap = 16;
    const vw = window.innerWidth, vh = window.innerHeight;
    let x, y;
    if (union.right + gap + CARD_W <= vw - 12) {          // room right?
      x = union.right + gap;
      y = Math.max(12, Math.min(vh - cardH - 12, union.top));
    } else if (union.left - gap - CARD_W >= 12) {          // room left?
      x = union.left - gap - CARD_W;
      y = Math.max(12, Math.min(vh - cardH - 12, union.top));
    } else if (union.bottom + gap + cardH <= vh - 12) {    // room below?
      x = Math.max(12, Math.min(vw - CARD_W - 12, union.left));
      y = union.bottom + gap;
    } else {                                                // fall back above
      x = Math.max(12, Math.min(vw - CARD_W - 12, union.left));
      y = Math.max(12, union.top - gap - cardH);
    }
    setPos({ x, y });
  }, [booth.id, partner?.id]);

  const onDragStart = (e) => {
    if (e.target.closest('button, input')) return;
    e.preventDefault();
    setDragging(true);
    const sx = e.clientX, sy = e.clientY, ox = pos.x, oy = pos.y;
    const onMove = (ev) => setPos({ x: ox + (ev.clientX - sx), y: oy + (ev.clientY - sy) });
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (!pos) return null;
  const sponsor = store.sponsorById[store.activeSponsorId];

  return (
    <div ref={cardRef}
         className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 z-50"
         style={{ left: pos.x, top: pos.y, width: CARD_W }}>
      {/* Drag handle header */}
      <div onMouseDown={onDragStart}
           style={{ cursor: dragging ? 'grabbing' : 'grab' }}
           className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 select-none">
        <span className="text-gray-300 leading-none" title="Drag to move">⋮⋮</span>
        <h5 className="font-semibold text-sm text-gray-900 flex-1">
          {step === 'select' ? `Booth ${booth.label}` : 'Are you sure?'}
        </h5>
        <button onClick={onCancel}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {step === 'select' && (
          <>
            <p className="text-sm mb-2">
              Select this booth as <strong>{sponsor?.name}</strong>?
            </p>
            {partner && (
              <div className="mt-2 p-2 rounded bg-pink-50 border border-pink-200 text-xs">
                <div>
                  ⊞ <strong>Double booth</strong> — this will also reserve the
                  {' '}{orientation === 'horizontal' ? 'horizontally' : 'vertically'} adjacent
                  {' '}booth <strong>{partner.label}</strong>.
                </div>
                {showOrientationToggle && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-gray-600">Orientation:</span>
                    <div className="inline-flex rounded overflow-hidden border border-pink-300">
                      <button onClick={() => onSetOrientation('vertical')}
                              className={`px-2 py-0.5 text-xs ${orientation === 'vertical' ? 'bg-pink-600 text-white' : 'bg-white text-pink-700 hover:bg-pink-50'}`}>
                        Vertical
                      </button>
                      <button onClick={() => onSetOrientation('horizontal')}
                              className={`px-2 py-0.5 text-xs ${orientation === 'horizontal' ? 'bg-pink-600 text-white' : 'bg-white text-pink-700 hover:bg-pink-50'}`}>
                        Horizontal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {step === 'confirm' && (
          <>
            <p className="text-sm">
              Once you select a booth, it will be locked in for your company.
              You will need to contact your meeting planner to request a change.
            </p>
            <div className="mt-2 text-sm text-gray-700">
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
          </>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100">
        {step === 'select' && (
          <div className="flex gap-2">
            <button onClick={onCancel}
                    className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">Cancel</button>
            <button onClick={onSelect}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded">
              Select this Booth
            </button>
          </div>
        )}
        {step === 'confirm' && (
          <div className="flex flex-col gap-2">
            <button onClick={onCancel}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">
              Cancel — I want to keep looking
            </button>
            <button onClick={onConfirm}
                    className="px-3 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded">
              Confirmed — this is my booth
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
