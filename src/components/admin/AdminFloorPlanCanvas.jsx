import { useRef, useState, useEffect } from 'react';
import { useStore } from '../../stores/StoreContext.jsx';
import { readableTextColor } from '../../utils/color.js';

export function AdminFloorPlanCanvas({ selectedBoothId, setSelectedBoothId, mode, onOpenPopup }) {
  const store = useStore();
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(null);
  const [drag, setDrag] = useState(null);
  const [drawing, setDrawing] = useState(null);

  const { floorPlan, booths, levelById, sponsorById } = store;
  const totalScale = scale * zoom;

  useEffect(() => {
    if (!containerRef.current || !floorPlan) return;
    const fit = () => {
      const r = containerRef.current.getBoundingClientRect();
      const s = Math.min(r.width / floorPlan.width, r.height / floorPlan.height, 1);
      setScale(s > 0 ? s : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [floorPlan]);

  const screenToImage = (cx, cy) => {
    const r = containerRef.current.getBoundingClientRect();
    const centerX = r.left + r.width / 2 + pan.x;
    const centerY = r.top + r.height / 2 + pan.y;
    return {
      x: (cx - centerX) / totalScale + floorPlan.width / 2,
      y: (cy - centerY) / totalScale + floorPlan.height / 2,
    };
  };

  // Drag booth
  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      const p = screenToImage(e.clientX, e.clientY);
      const dx = p.x - drag.startX, dy = p.y - drag.startY;
      const patch = drag.mode === 'move'
        ? { x: drag.orig.x + dx, y: drag.orig.y + dy }
        : { width: Math.max(10, drag.orig.width + dx), height: Math.max(10, drag.orig.height + dy) };
      store.updateBooth(drag.id, patch);
    };
    const onUp = () => setDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drag, store, totalScale]);

  // Draw new booth
  useEffect(() => {
    if (!drawing) return;
    const onMove = (e) => {
      const p = screenToImage(e.clientX, e.clientY);
      setDrawing(d => d ? { ...d,
        x: Math.min(d.startX, p.x), y: Math.min(d.startY, p.y),
        width: Math.abs(p.x - d.startX), height: Math.abs(p.y - d.startY),
      } : null);
    };
    const onUp = () => {
      if (drawing && drawing.width > 10 && drawing.height > 10) {
        const created = store.createBooth({
          x: drawing.x, y: drawing.y, width: drawing.width, height: drawing.height,
          label: `New ${booths.length + 1}`,
        });
        setSelectedBoothId(created.id);
      }
      setDrawing(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drawing, booths.length]);

  // Pan
  useEffect(() => {
    if (!panning) return;
    const onMove = (e) => setPan({ x: panning.ox + (e.clientX - panning.sx), y: panning.oy + (e.clientY - panning.sy) });
    const onUp = () => setPanning(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [panning]);

  const onContainerDown = (e) => {
    if (e.target.closest('rect.booth-rect') || e.target.closest('rect.resize-handle')) return;
    if (mode === 'add') {
      const p = screenToImage(e.clientX, e.clientY);
      setDrawing({ startX: p.x, startY: p.y, x: p.x, y: p.y, width: 0, height: 0 });
      return;
    }
    setPanning({ sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y });
  };
  const onWheel = (e) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.1;
    setZoom(z => Math.min(4, Math.max(0.3, z + delta)));
  };
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const boothLogo = (b) => {
    if (!store.settings.showSponsorLogos || !b.sponsorId) return null;
    return sponsorById[b.sponsorId]?.logoUrl || null;
  };
  const levelColor = (b) => levelById[b.levelId]?.color || '#3B82F6';

  const assignedCount = booths.filter(b => b.sponsorId).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2 flex-wrap">
        <div className="mr-auto text-xs text-gray-600">
          <b>{booths.length}</b> booths, <b>{assignedCount}</b> assigned
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.25))} className="w-8 h-8 border border-gray-300 rounded bg-white hover:bg-gray-50">−</button>
          <span className="text-xs text-gray-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="w-8 h-8 border border-gray-300 rounded bg-white hover:bg-gray-50">+</button>
          <button onClick={reset} className="ml-2 text-xs px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50">Fit</button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-gray-100"
           style={{ cursor: panning ? 'grabbing' : (mode === 'add' ? 'crosshair' : 'grab') }}
           onMouseDown={onContainerDown} onWheel={onWheel}>
        <div className="absolute"
             style={{
               left: '50%', top: '50%',
               transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${totalScale})`,
               transformOrigin: 'center center',
               width: floorPlan.width, height: floorPlan.height,
             }}>
          <img src={floorPlan.dataUrl} alt="floor plan" draggable={false}
               style={{ width: floorPlan.width, height: floorPlan.height, display: 'block' }} />
          <svg width={floorPlan.width} height={floorPlan.height}
               viewBox={`0 0 ${floorPlan.width} ${floorPlan.height}`}
               style={{ position: 'absolute', left: 0, top: 0 }}>
            {booths.map(b => {
              const fill = levelColor(b);
              const logo = boothLogo(b);
              const isSelected = b.id === selectedBoothId;
              return (
                <g key={b.id}>
                  <rect className="booth-rect"
                        x={b.x} y={b.y} width={b.width} height={b.height}
                        fill={fill} fillOpacity={b.sponsorId ? 0.85 : 0.45}
                        stroke={isSelected ? '#111827' : fill}
                        strokeWidth={isSelected ? 3 : 1.5}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedBoothId(b.id);
                          if (mode === 'edit') {
                            const p = screenToImage(e.clientX, e.clientY);
                            setDrag({ id: b.id, mode: 'move', startX: p.x, startY: p.y, orig: { ...b } });
                          }
                        }}
                        onClick={(e) => { e.stopPropagation(); if (mode !== 'edit' && mode !== 'add') onOpenPopup(b); }}
                  />
                  {logo && (
                    <image href={logo}
                           x={b.x + b.width * 0.1} y={b.y + b.height * 0.28}
                           width={b.width * 0.8} height={b.height * 0.6}
                           preserveAspectRatio="xMidYMid meet"
                           style={{ pointerEvents: 'none' }} />
                  )}
                  <text className="booth-label"
                        x={b.x + b.width / 2}
                        y={logo ? b.y + b.height * 0.2 : b.y + b.height / 2 + 3}
                        textAnchor="middle"
                        style={{ fill: readableTextColor(fill) }}>
                    {b.label}
                  </text>
                  {mode === 'edit' && isSelected && (
                    <rect className="resize-handle"
                          x={b.x + b.width - 6} y={b.y + b.height - 6}
                          width="12" height="12"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const p = screenToImage(e.clientX, e.clientY);
                            setDrag({ id: b.id, mode: 'resize', startX: p.x, startY: p.y, orig: { ...b } });
                          }} />
                  )}
                  {b.partnerBoothId && store.boothById[b.partnerBoothId] && (
                    <line x1={b.x + b.width/2} y1={b.y + b.height/2}
                          x2={store.boothById[b.partnerBoothId].x + store.boothById[b.partnerBoothId].width/2}
                          y2={store.boothById[b.partnerBoothId].y + store.boothById[b.partnerBoothId].height/2}
                          stroke="#111827" strokeWidth="2" strokeDasharray="4,3" />
                  )}
                </g>
              );
            })}
            {drawing && (
              <rect x={drawing.x} y={drawing.y} width={drawing.width} height={drawing.height}
                    fill="#3B82F6" fillOpacity="0.25" stroke="#3B82F6" strokeWidth="2" strokeDasharray="6,3" />
            )}
          </svg>
        </div>
        {booths.length === 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-sm p-6 text-center max-w-sm">
            <div className="text-2xl mb-2 text-gray-300">▦</div>
            <h6 className="font-semibold">No booths yet</h6>
            <p className="text-xs text-gray-500 mt-1">
              Switch to <code className="text-pink-600">+ Add</code> in the sidebar and drag to draw a booth,
              or click <b>Re-run auto-detect</b>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
