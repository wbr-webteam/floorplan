import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../stores/StoreContext.jsx';
import { readableTextColor } from '../../utils/color.js';

export function PublicView() {
  const store = useStore();
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(null);
  const [selected, setSelected] = useState(null);
  const [cardPos, setCardPos] = useState(null);
  const [cardDragging, setCardDragging] = useState(false);

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

  useEffect(() => {
    if (!panning) return;
    const onMove = (e) => setPan({ x: panning.ox + (e.clientX - panning.sx), y: panning.oy + (e.clientY - panning.sy) });
    const onUp = () => setPanning(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [panning]);

  const onWheel = (e) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.1;
    setZoom(z => Math.min(4, Math.max(0.3, z + delta)));
  };
  const onContainerDown = (e) => {
    if (e.target.closest('[data-booth-id]')) return;
    setPanning({ sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y });
  };
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Anchor sponsor card next to the clicked booth (same pattern as BoothActionCard).
  useEffect(() => {
    if (!selected) { setCardPos(null); return; }
    const el = document.querySelector(`[data-booth-id="${selected.booth.id}"] rect.booth-rect`);
    if (!el) { setCardPos({ x: window.innerWidth - 360 - 24, y: 100 }); return; }
    const rect = el.getBoundingClientRect();
    const CARD_W = 340, cardH = 220;
    const gap = 16, vw = window.innerWidth, vh = window.innerHeight;
    let x, y;
    if (rect.right + gap + CARD_W <= vw - 12) {
      x = rect.right + gap; y = Math.max(12, Math.min(vh - cardH - 12, rect.top));
    } else if (rect.left - gap - CARD_W >= 12) {
      x = rect.left - gap - CARD_W; y = Math.max(12, Math.min(vh - cardH - 12, rect.top));
    } else if (rect.bottom + gap + cardH <= vh - 12) {
      x = Math.max(12, Math.min(vw - CARD_W - 12, rect.left)); y = rect.bottom + gap;
    } else {
      x = Math.max(12, Math.min(vw - CARD_W - 12, rect.left)); y = Math.max(12, rect.top - gap - cardH);
    }
    setCardPos({ x, y });
  }, [selected?.booth.id]);

  const onCardDragStart = (e) => {
    if (e.target.closest('button, a')) return;
    e.preventDefault();
    setCardDragging(true);
    const sx = e.clientX, sy = e.clientY, ox = cardPos.x, oy = cardPos.y;
    const onMove = (ev) => setCardPos({ x: ox + (ev.clientX - sx), y: oy + (ev.clientY - sy) });
    const onUp = () => {
      setCardDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (!floorPlan) return null;

  const onBoothClick = (b) => {
    const sponsor = b.sponsorId ? sponsorById[b.sponsorId] : null;
    setSelected({ booth: b, sponsor });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2 flex-wrap">
        <div className="mr-auto text-sm">
          <span className="text-xs uppercase tracking-wide text-gray-500">Attendee view</span>
          <span className="ml-2 text-gray-700">Tap a booth to view sponsor details.</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.25))} className="w-8 h-8 border border-gray-300 rounded bg-white hover:bg-gray-50">−</button>
          <span className="text-xs text-gray-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="w-8 h-8 border border-gray-300 rounded bg-white hover:bg-gray-50">+</button>
          <button onClick={reset} className="ml-2 text-xs px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50">Fit</button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-gray-100"
           style={{ cursor: panning ? 'grabbing' : 'grab' }}
           onMouseDown={onContainerDown} onWheel={onWheel}>
        <div className="absolute"
             style={{
               left: '50%', top: '50%',
               transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${totalScale})`,
               transformOrigin: 'center center',
               width: floorPlan.width, height: floorPlan.height,
             }}>
          <img src={floorPlan.dataUrl} alt="floor plan" draggable={false}
               style={{ display: 'block', width: floorPlan.width, height: floorPlan.height }} />
          <svg width={floorPlan.width} height={floorPlan.height}
               viewBox={`0 0 ${floorPlan.width} ${floorPlan.height}`}
               style={{ position: 'absolute', left: 0, top: 0 }}>
            {booths.map(b => {
              const lvl = levelById[b.levelId];
              const fill = lvl?.color || '#3B82F6';
              const sponsor = b.sponsorId ? sponsorById[b.sponsorId] : null;
              const logo = sponsor && store.settings.showSponsorLogos ? sponsor.logoUrl : null;
              const isSelected = selected?.booth.id === b.id;
              return (
                <g key={b.id} data-booth-id={b.id}
                   style={{ cursor: 'pointer' }}
                   onClick={(e) => { e.stopPropagation(); onBoothClick(b); }}>
                  <rect className="booth-rect"
                        x={b.x} y={b.y} width={b.width} height={b.height}
                        fill={fill} fillOpacity={sponsor ? 0.85 : 0.35}
                        stroke={isSelected ? '#111827' : fill}
                        strokeWidth={isSelected ? 3 : 1.5} />
                  {logo && (
                    <image href={logo}
                           x={b.x + b.width * 0.1} y={b.y + b.height * 0.28}
                           width={b.width * 0.8} height={b.height * 0.6}
                           preserveAspectRatio="xMidYMid meet"
                           style={{ pointerEvents: 'none' }} />
                  )}
                  <text className="booth-label"
                        x={b.x + b.width/2}
                        y={logo ? b.y + b.height * 0.2 : b.y + b.height/2 + 3}
                        textAnchor="middle"
                        style={{ fill: readableTextColor(fill) }}>
                    {b.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Category legend */}
        <div className="absolute bottom-0 left-0 m-3 bg-white rounded-lg shadow px-3 py-2 text-xs space-y-1">
          {store.levels.map(lvl => (
            <div key={lvl.id} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: lvl.color }} />
              {lvl.name}
            </div>
          ))}
        </div>
      </div>

      {/* Sponsor detail card */}
      {selected && cardPos && (
        <div className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 z-50"
             style={{ left: cardPos.x, top: cardPos.y, width: 340 }}>
          <div onMouseDown={onCardDragStart}
               style={{ cursor: cardDragging ? 'grabbing' : 'grab' }}
               className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 select-none">
            <span className="text-gray-300 leading-none" title="Drag">⋮⋮</span>
            <h5 className="font-semibold text-sm text-gray-900 flex-1">
              Booth {selected.booth.label}
            </h5>
            <button onClick={() => setSelected(null)}
                    className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
          </div>
          <div className="px-4 py-3">
            {selected.sponsor ? (
              <>
                <div className="flex items-center gap-3">
                  {store.settings.showSponsorLogos && selected.sponsor.logoUrl && (
                    <img src={selected.sponsor.logoUrl} alt=""
                         className="w-16 h-16 rounded-full border border-gray-200 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{selected.sponsor.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-sm"
                            style={{ background: levelById[selected.sponsor.levelId]?.color }} />
                      {levelById[selected.sponsor.levelId]?.name}
                    </div>
                  </div>
                </div>
                {selected.sponsor.website && (
                  <a href={selected.sponsor.website} target="_blank" rel="noopener noreferrer"
                     className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline break-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Visit sponsor page
                  </a>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500 italic">This booth doesn't have a sponsor assigned yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
