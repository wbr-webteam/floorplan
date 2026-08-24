import { useState, useEffect } from 'react';
import { useStore } from '../../stores/StoreContext.jsx';
import { detectBoothRects } from '../../utils/boothDetection.js';
import { labelRectsWithOcr } from '../../utils/ocr.js';
import { loadImage } from '../upload/loadImage.js';
import { ScanRegionSelector } from '../upload/ScanRegionSelector.jsx';
import { Modal } from '../shared/Modal.jsx';

export function ReDetectBoothsModal({ onClose }) {
  const store = useStore();
  const [step, setStep] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [imageEl, setImageEl] = useState(null);
  const [region, setRegion] = useState(null);
  const [ocrProgress, setOcrProgress] = useState({ done: 0, total: 0, label: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const img = await loadImage(store.floorPlan.dataUrl);
        if (cancelled) return;
        setImageEl(img);
        setStep('region');
      } catch (e) {
        setError('Could not load the current floor plan image.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const run = async (useRegion) => {
    setBusy(true); setError('');
    try {
      const rects = detectBoothRects(imageEl, useRegion ? region : null);
      let labelled = [];
      if (rects.length) {
        setStep('ocr');
        setOcrProgress({ done: 0, total: rects.length, label: '' });
        labelled = await labelRectsWithOcr(imageEl, rects, (p) => setOcrProgress({ ...p }));
      }
      store.saveDetectedBooths(labelled);
      if (!labelled.length) {
        setError('No booth squares detected in that area. Try a smaller region around one row of booths, or use "+ Add" in the sidebar.');
        setStep('region');
        return;
      }
      onClose();
    } catch (e) {
      setError(e.message || String(e));
      setStep('region');
    } finally { setBusy(false); }
  };

  const progressPct = ocrProgress.total ? Math.round((ocrProgress.done / ocrProgress.total) * 100) : 0;

  return (
    <Modal onClose={busy ? undefined : onClose} size="full" backdropClose={!busy}>
      <div className="flex flex-col" style={{ height: '85vh' }}>
        <div className="px-5 py-3 border-b flex items-center gap-2">
          <h3 className="text-lg font-semibold">Re-run auto-detect</h3>
          <button onClick={onClose} disabled={busy} className="ml-auto text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        {step === 'loading' && (
          <div className="flex-1 flex items-center justify-center text-gray-500">Loading floor plan…</div>
        )}
        {step === 'region' && imageEl && (
          <>
            <div className="bg-white border-b px-3 py-2 flex items-center gap-2 flex-wrap">
              <div className="mr-auto text-sm">
                <strong>Select scan area</strong>
                <span className="text-gray-500 ml-2">Existing booths will be replaced.</span>
              </div>
              <button onClick={() => setRegion(null)} className="px-3 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50">Clear region</button>
              <button onClick={() => run(false)} disabled={busy}
                      className="px-3 py-1.5 text-xs border border-blue-600 text-blue-600 rounded bg-white hover:bg-blue-50 disabled:opacity-50">
                Scan whole image
              </button>
              <button onClick={() => run(true)} disabled={!region || busy}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                Scan region
              </button>
            </div>
            <ScanRegionSelector imageSrc={store.floorPlan.dataUrl}
                                imageWidth={imageEl.naturalWidth} imageHeight={imageEl.naturalHeight}
                                region={region} onChangeRegion={setRegion} />
          </>
        )}
        {step === 'ocr' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <h5 className="mb-3 font-semibold">Reading booth labels…</h5>
            <div className="w-1/2 h-3 bg-gray-100 rounded overflow-hidden">
              <div className="h-3 bg-blue-500 transition-all" style={{ width: progressPct + '%' }} />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              OCR'd {ocrProgress.done} / {ocrProgress.total} booths
              {ocrProgress.label && <> — last read: <code>{ocrProgress.label}</code></>}
            </div>
          </div>
        )}
        {error && <div className="mx-3 mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>}
      </div>
    </Modal>
  );
}
