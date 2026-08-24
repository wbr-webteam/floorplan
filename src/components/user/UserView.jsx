import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../stores/StoreContext.jsx';
import { findAdjacentPartners, pickPartnerBySetting } from '../../utils/adjacency.js';
import { readableTextColor } from '../../utils/color.js';
import { BoothMessageModal } from './BoothMessageModal.jsx';
import { BoothActionCard } from './BoothActionCard.jsx';

export function UserView() {
  const store = useStore();
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(null);
  const [message, setMessage] = useState(null);
  // Unified selection flow — `action` holds { booth, step: 'select'|'confirm' }
  const [action, setAction] = useState(null);

  const { floorPlan, booths, levelById, sponsorById } = store;
  const activeSponsor = store.activeSponsorId ? sponsorById[store.activeSponsorId] : null;
  const activeLevel = activeSponsor ? levelById[activeSponsor.levelId] : null;
  const lockedBooth = activeSponsor ? booths.find(b => b.sponsorId === activeSponsor.id && b.locked) : null;
  const lockedPartner = lockedBooth?.partnerBoothId ? store.boothById[lockedBooth.partnerBoothId] : null;

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
  }, [floorPlan, store.activeSponsorId]);

  useEffect(() => {
    if (!panning) return;
    const onMove = (e) => setPan({ x: panning.ox + (e.clientX - panning.sx), y: panning.oy + (e.clientY - panning.sy) });
    const onUp = () => setPanning(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [panning]);

  const totalScale = scale * zoom;
  const onContainerDown = (e) => {
    if (e.target.closest('g.booth-group')) return;
    setPanning({ sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y });
  };
  const onWheel = (e) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.1;
    setZoom(z => Math.min(4, Math.max(0.3, z + delta)));
  };
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const orderBlock = (() => {
    if (!store.settings.enforceSelectionOrder || !activeSponsor || lockedBooth) return '';
    if (store.canSponsorPickNow(store.activeSponsorId)) return '';
    const ordered = store.sponsorsAtLevel(activeSponsor.levelId);
    for (const ahead of ordered) {
      if (ahead.id === activeSponsor.id) break;
      const has = booths.some(b => b.sponsorId === ahead.id);
      if (!has) return `Selection order is enforced: ${ahead.name} must be assigned a booth first.`;
    }
    return '';
  })();

  const boothFill = (b) => {
    if (!activeSponsor) return levelById[b.levelId]?.color || '#3B82F6';
    if (b.sponsorId === activeSponsor.id) return levelById[b.levelId]?.color || '#3B82F6';
    if (b.sponsorId) return '#9CA3AF';
    if (b.levelId !== activeSponsor.levelId) return '#D1D5DB';
    return levelById[b.levelId]?.color || '#3B82F6';
  };
  const boothOpacity = (b) => {
    if (!activeSponsor) return 0.5;
    if (b.sponsorId === activeSponsor.id) return 0.95;
    if (b.sponsorId) return 0.7;
    return 0.5;
  };
  const boothLogo = (b) => {
    if (!store.settings.showSponsorLogos || !b.sponsorId) return null;
    return sponsorById[b.sponsorId]?.logoUrl || null;
  };

  const handleBoothClick = (b) => {
    if (!activeSponsor) return;
    if (b.sponsorId === activeSponsor.id) {
      setMessage({ title: `Booth ${b.label}`, body: b.locked ? 'This is your booth (locked in). Contact your meeting planner to change.' : 'This is your currently held booth.' });
      return;
    }
    if (b.sponsorId) {
      const sponsor = sponsorById[b.sponsorId];
      const showName = store.settings.showAssignmentsToSponsors;
      setMessage({
        title: `Booth ${b.label}`,
        body: showName ? `Assigned to ${sponsor?.name || 'another sponsor'}.` : 'Booth Occupied',
        sponsor: showName ? sponsor : null,
      });
      return;
    }
    if (b.levelId !== activeSponsor.levelId) {
      setMessage({ title: `Booth ${b.label}`, body: `This booth is in another category (${levelById[b.levelId]?.name}).` });
      return;
    }
    if (lockedBooth) {
      setMessage({ title: `Booth ${lockedBooth.label}`, body: 'You have already locked in your booth. Contact your meeting planner to change.' });
      return;
    }
    if (!store.canSponsorPickNow(store.activeSponsorId)) {
      setMessage({ title: 'Not your turn yet', body: orderBlock || 'Selection order is enforced; sponsors ahead of you must be assigned first.' });
      return;
    }
    if (activeSponsor.isDoubleBooth) {
      const parts = findAdjacentPartners(b, booths);
      const orient = store.settings.doubleBoothOrientation;
      const availableVert  = !!parts.vertical;
      const availableHoriz = !!parts.horizontal;
      let allowed = false;
      if (orient === 'vertical')   allowed = availableVert;
      else if (orient === 'horizontal') allowed = availableHoriz;
      else allowed = availableVert || availableHoriz;
      if (!allowed) {
        const which = orient === 'vertical' ? 'vertical ' : orient === 'horizontal' ? 'horizontal ' : '';
        setMessage({ title: `Booth ${b.label}`, body: `Your booking requires a double booth, but this booth has no ${which}adjacent empty same-category booth. Pick a different booth.` });
        return;
      }
    }
    setAction({ booth: b, step: 'select' });
  };

  // Given a booth and the current orientation choice, return the partner (or null).
  const partnerFor = (b, prefOrient) => {
    if (!activeSponsor?.isDoubleBooth) return null;
    return pickPartnerBySetting(b, booths, store.settings.doubleBoothOrientation, prefOrient);
  };

  // Track user's orientation choice (only meaningful when setting = 'user-toggle')
  const [chosenOrient, setChosenOrient] = useState('vertical');

  const doConfirm = () => {
    if (!action) return;
    const chosen = store.settings.doubleBoothOrientation === 'user-toggle'
      ? chosenOrient : store.settings.doubleBoothOrientation;
    const partner = partnerFor(action.booth, chosen);
    const res = store.lockBoothForSponsor(action.booth.id, store.activeSponsorId, {
      partnerBoothId: partner?.id ?? null,
      orientation: chosen,
    });
    setAction(null);
    if (!res.ok) {
      setMessage({ title: 'Selection rejected', body: res.message });
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sponsor picker (test mode) */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="text-xs uppercase tracking-wide text-gray-500">Test mode</div>
          <div className="text-sm font-medium text-gray-900 mt-0.5">Pick a sponsor</div>
          <div className="text-xs text-gray-500 mt-1">In production this comes from CMS auth.</div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin">
          {store.levels.map(level => {
            const lvSponsors = store.sponsorsAtLevel(level.id);
            return (
              <div key={level.id}>
                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: level.color }} />
                  {level.name}
                </div>
                {lvSponsors.map(sp => {
                  const myBooth = booths.find(b => b.sponsorId === sp.id);
                  return (
                    <button key={sp.id} onClick={() => store.setActiveSponsorId(sp.id)}
                            className={`w-full text-left px-4 py-2 border-b border-gray-100 hover:bg-blue-50 flex items-center gap-2 ${store.activeSponsorId === sp.id ? 'bg-blue-50' : ''}`}>
                      {store.settings.showSponsorLogos && sp.logoUrl && (
                        <img src={sp.logoUrl} alt="" className="w-6 h-6 rounded-full" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 truncate flex items-center gap-1">
                          {sp.name}
                          {sp.isDoubleBooth && <span className="text-[9px] uppercase font-semibold text-amber-700 bg-amber-100 px-1 py-0.5 rounded">2×</span>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {myBooth ? (myBooth.locked ? `🔒 ${myBooth.label}` : `Held: ${myBooth.label}`) : 'No booth'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeSponsor ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">← Pick a sponsor to view the floor plan.</div>
        ) : (
          <>
            <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2 flex-wrap">
              <div className="mr-auto text-sm flex items-center gap-2">
                {store.settings.showSponsorLogos && activeSponsor.logoUrl && (
                  <img src={activeSponsor.logoUrl} alt="" className="w-6 h-6 rounded-full" />
                )}
                Viewing as <strong>{activeSponsor.name}</strong>
                <span className="text-xs px-2 py-0.5 rounded"
                      style={{ background: activeLevel?.color, color: readableTextColor(activeLevel?.color) }}>
                  {activeLevel?.name}
                </span>
                {activeSponsor.isDoubleBooth && (
                  <span className="text-xs uppercase font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Double booth</span>
                )}
                {lockedBooth && (
                  <span className="text-xs uppercase font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                    🔒 Locked: {lockedBooth.label}{lockedPartner && ` + ${lockedPartner.label}`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom(z => Math.max(0.3, z - 0.25))} className="w-8 h-8 border border-gray-300 rounded bg-white hover:bg-gray-50">−</button>
                <span className="text-xs text-gray-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="w-8 h-8 border border-gray-300 rounded bg-white hover:bg-gray-50">+</button>
                <button onClick={reset} className="ml-2 text-xs px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50">Fit</button>
              </div>
            </div>
            {orderBlock && (
              <div className="mx-3 mt-3 p-2 rounded bg-cyan-50 border border-cyan-200 text-xs text-cyan-800">
                ℹ️ {orderBlock}
              </div>
            )}
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
                    const fill = boothFill(b);
                    const logo = boothLogo(b);
                    const isOwnLocked = b.id === lockedBooth?.id || b.id === lockedPartner?.id;
                    const isPendingPrimary = !!(action && action.booth.id === b.id);
                    // Compute pending partner using the effective orientation of the current flow
                    const pendingOrient = store.settings.doubleBoothOrientation === 'user-toggle'
                      ? chosenOrient : store.settings.doubleBoothOrientation;
                    const pendingPartner = action && activeSponsor?.isDoubleBooth
                      ? partnerFor(action.booth, pendingOrient) : null;
                    const isPendingPartner = !!(pendingPartner && pendingPartner.id === b.id);
                    const pendingClass = isPendingPrimary
                      ? 'booth-pending-primary'
                      : isPendingPartner ? 'booth-pending-partner' : '';
                    return (
                      <g key={b.id} className="booth-group" data-booth-id={b.id}
                         onClick={(e) => { e.stopPropagation(); handleBoothClick(b); }}>
                        <rect className={`booth-rect ${pendingClass}`}
                              x={b.x} y={b.y} width={b.width} height={b.height}
                              fill={fill} fillOpacity={boothOpacity(b)}
                              stroke={(isPendingPrimary || isPendingPartner) ? undefined
                                : (b.sponsorId === activeSponsor.id ? '#111827' : fill)}
                              strokeWidth={(isPendingPrimary || isPendingPartner) ? undefined
                                : (isOwnLocked ? 3 : 1.5)} />
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
              <div className="absolute bottom-3 left-3 bg-white rounded-lg shadow px-3 py-2 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: activeLevel?.color }} />
                  Available ({activeLevel?.name})
                </div>
                <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-gray-400" /> Occupied</div>
                <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-gray-300" /> Other category</div>
              </div>
            </div>
          </>
        )}
      </div>

      {message && <BoothMessageModal {...message} onClose={() => setMessage(null)} />}
      {action && (() => {
        const parts = findAdjacentPartners(action.booth, booths);
        const orient = store.settings.doubleBoothOrientation;
        const isDouble = !!activeSponsor?.isDoubleBooth;
        const canToggle = isDouble && orient === 'user-toggle' && parts.vertical && parts.horizontal;
        // If setting is user-toggle but only one orientation is possible, snap to it.
        const effectiveChoice = !isDouble ? null
          : orient === 'vertical'   ? 'vertical'
          : orient === 'horizontal' ? 'horizontal'
          : (parts.vertical && parts.horizontal) ? chosenOrient
          : (parts.vertical ? 'vertical' : 'horizontal');
        const activePartner = !isDouble ? null
          : effectiveChoice === 'vertical' ? parts.vertical : parts.horizontal;
        return (
          <BoothActionCard
            booth={action.booth}
            partner={activePartner}
            step={action.step}
            showOrientationToggle={canToggle}
            orientation={effectiveChoice}
            onSetOrientation={setChosenOrient}
            onCancel={() => setAction(null)}
            onSelect={() => setAction({ ...action, step: 'confirm' })}
            onConfirm={doConfirm}
          />
        );
      })()}
    </div>
  );
}
