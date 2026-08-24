import { useState, useRef } from 'react';
import { useStore } from '../../stores/StoreContext.jsx';
import { pdfFirstPageToBlob } from '../../utils/pdf.js';
import { loadImage } from '../upload/loadImage.js';
import { AdminSidebar } from './AdminSidebar.jsx';
import { AdminFloorPlanCanvas } from './AdminFloorPlanCanvas.jsx';
import { BoothEditPopup } from './BoothEditPopup.jsx';
import { AssignSponsorModal } from './AssignSponsorModal.jsx';
import { ReDetectBoothsModal } from './ReDetectBoothsModal.jsx';
import { SponsorImportModal } from './sponsorImport/SponsorImportModal.jsx';

export function AdminView() {
  const store = useStore();
  const [selectedBoothId, setSelectedBoothId] = useState(null);
  const [mode, setMode] = useState('select');
  const [popupBooth, setPopupBooth] = useState(null);
  const [assignBooth, setAssignBooth] = useState(null);
  const [showReDetect, setShowReDetect] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const reuploadRef = useRef(null);

  const openPopup = (b) => { setSelectedBoothId(b.id); setPopupBooth(b); };
  const openAssign = (b) => { setSelectedBoothId(b.id); setPopupBooth(null); setAssignBooth(b); };

  const onReupload = () => reuploadRef.current?.click();
  const onReDetect = () => {
    if (store.booths.length > 0) {
      if (!confirm(`Re-running auto-detect will replace all ${store.booths.length} existing booths and their sponsor assignments. Continue?`)) return;
    }
    setShowReDetect(true);
  };
  const onReuploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return; e.target.value = '';
    let dataUrl;
    if (file.type === 'application/pdf') {
      const blob = await pdfFirstPageToBlob(file);
      dataUrl = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    } else {
      dataUrl = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
    }
    const img = await loadImage(dataUrl);
    if (img.naturalWidth !== store.floorPlan.width || img.naturalHeight !== store.floorPlan.height) {
      if (!confirm('The new image has different dimensions than the existing booth coordinates. Booth positions will not be moved automatically. Continue?')) return;
    }
    store.replaceFloorPlanImage(dataUrl, img.naturalWidth, img.naturalHeight);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <AdminSidebar mode={mode} setMode={setMode}
                    onOpenAssign={openAssign}
                    onReupload={onReupload} onReDetect={onReDetect}
                    onImportSponsors={() => setShowImport(true)}
                    selectedBoothId={selectedBoothId} setSelectedBoothId={setSelectedBoothId} />
      <AdminFloorPlanCanvas selectedBoothId={selectedBoothId} setSelectedBoothId={setSelectedBoothId}
                            mode={mode} onOpenPopup={openPopup} />
      {popupBooth && <BoothEditPopup booth={popupBooth} onClose={() => setPopupBooth(null)} onOpenAssign={openAssign} />}
      {assignBooth && <AssignSponsorModal booth={assignBooth} onClose={() => setAssignBooth(null)} />}
      {showReDetect && <ReDetectBoothsModal onClose={() => setShowReDetect(false)} />}
      {showImport && <SponsorImportModal onClose={() => setShowImport(false)} />}
      <input ref={reuploadRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={onReuploadFile} />
    </div>
  );
}
