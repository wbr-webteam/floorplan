import { useRef, useState } from 'react';
import { useStore } from '../../stores/StoreContext.jsx';
import { pdfFirstPageToBlob } from '../../utils/pdf.js';
import { detectBoothRects } from '../../utils/boothDetection.js';
import { labelRectsWithOcr } from '../../utils/ocr.js';
import { loadImage } from './loadImage.js';
import { ScanRegionSelector } from './ScanRegionSelector.jsx';
import { SavedProjectsList } from './SavedProjectsList.jsx';

export function UploadStep() {
  const store = useStore();
  const inputRef = useRef(null);
  const [step, setStep] = useState('pick'); // pick | region | ocr
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageEl, setImageEl] = useState(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const [region, setRegion] = useState(null);
  const [ocrProgress, setOcrProgress] = useState({ done: 0, total: 0, label: '' });

  const handleFile = async (file) => {
    if (!file) return;
    setError(''); setBusy(true);
    try {
      let dataUrl;
      if (file.type === 'application/pdf') {
        const blob = await pdfFirstPageToBlob(file);
        dataUrl = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      } else if (file.type.startsWith('image/')) {
        dataUrl = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
      } else throw new Error('Please upload a PNG, JPG, or PDF.');
      const img = await loadImage(dataUrl);
      setPreviewUrl(dataUrl);
      setImageEl(img);
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
      setStep('region');
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const runDetection = async (useRegion) => {
    setBusy(true);
    try {
      const rects = detectBoothRects(imageEl, useRegion ? region : null);
      let labelled = [];
      if (rects.length) {
        setStep('ocr');
        setOcrProgress({ done: 0, total: rects.length, label: '' });
        labelled = await labelRectsWithOcr(imageEl, rects, (p) => setOcrProgress({ ...p }));
      }
      store.uploadFloorPlan(previewUrl, imgDims.w, imgDims.h);
      store.saveDetectedBooths(labelled);
      if (!labelled.length) {
        alert('No booth squares were auto-detected. Switch to "+ Add" in the sidebar to draw them manually, or click "Re-run auto-detect" to try a different scan region.');
      }
    } catch (e) {
      setError(e.message || String(e));
      setStep('region');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) handleFile(e.dataTransfer.files[0]);
  };
  const progressPct = ocrProgress.total ? Math.round((ocrProgress.done / ocrProgress.total) * 100) : 0;

  if (step === 'pick') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 overflow-auto">
        <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
             className="max-w-2xl w-full bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Floor Plan</h2>
          <p className="text-gray-500 mb-6">PNG, JPG, or PDF — we'll auto-detect booth squares and read their printed labels with OCR.</p>
          <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
                 onChange={(e) => handleFile(e.target.files?.[0])} />
          <button onClick={() => inputRef.current?.click()} disabled={busy}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {busy ? 'Processing…' : 'Choose file'}
          </button>
          <p className="text-xs text-gray-400 mt-3">…or drop a file here</p>
          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
        </div>
        <SavedProjectsList />
      </div>
    );
  }
  if (step === 'region') {
    return (
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b px-3 py-2 flex items-center gap-2 flex-wrap">
          <div className="mr-auto text-sm">
            <strong>Select scan area</strong>
            <span className="text-gray-500 ml-2">Drag to limit the area, or scan the whole image.</span>
          </div>
          <button onClick={() => setRegion(null)} className="px-3 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50">Clear region</button>
          <button onClick={() => runDetection(false)} disabled={busy}
                  className="px-3 py-1.5 text-xs border border-blue-600 text-blue-600 rounded bg-white hover:bg-blue-50 disabled:opacity-50">
            Scan whole image
          </button>
          <button onClick={() => runDetection(true)} disabled={!region || busy}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {busy ? 'Working…' : 'Scan region'}
          </button>
        </div>
        <ScanRegionSelector imageSrc={previewUrl} imageWidth={imgDims.w} imageHeight={imgDims.h}
                            region={region} onChangeRegion={setRegion} />
        {error && <div className="p-3 text-sm text-red-600">{error}</div>}
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="bg-white rounded-xl shadow p-6 min-w-[380px]">
        <h5 className="mb-3 font-semibold text-center">Reading booth labels…</h5>
        <div className="h-3 bg-gray-100 rounded overflow-hidden">
          <div className="h-3 bg-blue-500 transition-all" style={{ width: progressPct + '%' }} />
        </div>
        <div className="text-xs text-gray-500 mt-2 text-center">
          OCR'd {ocrProgress.done} / {ocrProgress.total} booths
          {ocrProgress.label && <> — last read: <code>{ocrProgress.label}</code></>}
        </div>
      </div>
    </div>
  );
}
