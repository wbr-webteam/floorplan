import { useState, useCallback, useMemo, createContext, useContext } from 'react';
import { uid } from '../utils/uid.js';
import { DEFAULT_LEVELS, generateSampleSponsors } from '../utils/sampleData.js';
import { pickPartnerBySetting } from '../utils/adjacency.js';

export const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

// -------- Local project persistence (localStorage) --------
const PROJECTS_KEY = 'booth-selector-v2-projects';
function loadProjectsIndex() {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function writeProjectsIndex(projects) {
  try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)); return true; }
  catch (e) {
    alert('Could not save — most likely browser storage is full. Delete an old project and try again. (' + (e.message || e) + ')');
    return false;
  }
}

export function useStoreProvider() {
  const [role, setRole] = useState('admin');
  const [floorPlan, setFloorPlan] = useState(null);
  const [booths, setBooths] = useState([]);
  const [levels, setLevels] = useState(DEFAULT_LEVELS);
  const [sponsors, setSponsors] = useState(() => generateSampleSponsors(DEFAULT_LEVELS));
  const [settings, setSettings] = useState({
    showAssignmentsToSponsors: true,
    showSponsorLogos: true,
    enforceSelectionOrder: true,
    doubleBoothOrientation: 'vertical', // 'vertical' | 'horizontal' | 'user-toggle'
  });
  const [activeSponsorId, setActiveSponsorId] = useState(null);
  const [projects, setProjects] = useState(() => loadProjectsIndex());
  const [currentProjectId, setCurrentProjectId] = useState(null);

  // --- lookup helpers ---
  const levelById  = useMemo(() => Object.fromEntries(levels.map(l => [l.id, l])), [levels]);
  const sponsorById = useMemo(() => Object.fromEntries(sponsors.map(s => [s.id, s])), [sponsors]);
  const boothById  = useMemo(() => Object.fromEntries(booths.map(b => [b.id, b])), [booths]);

  const boothsAtLevel = useCallback((lid) => booths.filter(b => b.levelId === lid), [booths]);
  const sponsorsAtLevel = useCallback((lid) =>
    sponsors.filter(s => s.levelId === lid).sort((a, b) => a.position - b.position),
    [sponsors]);
  const unassignedSponsorsAtLevel = useCallback((lid) =>
    sponsorsAtLevel(lid).filter(sp => !booths.some(b => b.sponsorId === sp.id)),
    [sponsorsAtLevel, booths]);

  const canSponsorPickNow = useCallback((sponsorId) => {
    if (!settings.enforceSelectionOrder) return true;
    const sp = sponsorById[sponsorId];
    if (!sp) return false;
    if (booths.some(b => b.sponsorId === sp.id && b.locked)) return false;
    const ordered = sponsorsAtLevel(sp.levelId);
    for (const ahead of ordered) {
      if (ahead.id === sp.id) return true;
      const aheadHas = booths.some(b => b.sponsorId === ahead.id);
      if (!aheadHas) return false;
    }
    return false;
  }, [settings.enforceSelectionOrder, booths, sponsorById, sponsorsAtLevel]);

  // --- mutators ---
  const uploadFloorPlan = useCallback((dataUrl, w, h) => {
    setFloorPlan({ dataUrl, width: w, height: h });
  }, []);
  const replaceFloorPlanImage = useCallback((dataUrl, w, h) => {
    setFloorPlan(fp => fp ? { ...fp, dataUrl, width: w, height: h } : { dataUrl, width: w, height: h });
  }, []);

  const saveDetectedBooths = useCallback((detected) => {
    const generalLevel = levels.find(l => l.name.toLowerCase() === 'general') || levels[levels.length - 1];
    setBooths(detected.map(b => ({
      id: uid(),
      label: b.label, x: b.x, y: b.y, width: b.width, height: b.height,
      levelId: generalLevel.id,
      sponsorId: null, locked: false, partnerBoothId: null,
    })));
  }, [levels]);

  const createBooth = useCallback((rect) => {
    const generalLevel = levels.find(l => l.name.toLowerCase() === 'general') || levels[0];
    const newBooth = {
      id: uid(),
      label: rect.label || `New ${booths.length + 1}`,
      x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      levelId: rect.levelId || generalLevel.id,
      sponsorId: null, locked: false, partnerBoothId: null,
    };
    setBooths(bs => [...bs, newBooth]);
    return newBooth;
  }, [levels, booths.length]);

  const updateBooth = useCallback((id, patch) => {
    setBooths(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b));
  }, []);

  const deleteBooth = useCallback((id) => {
    setBooths(bs => {
      const target = bs.find(b => b.id === id);
      let next = bs.filter(b => b.id !== id);
      if (target?.partnerBoothId) {
        next = next.map(b => b.id === target.partnerBoothId
          ? { ...b, sponsorId: null, locked: false, partnerBoothId: null } : b);
      }
      return next;
    });
  }, []);

  const assignSponsor = useCallback((boothId, sponsorId, opts = {}) => {
    setBooths(bs => {
      const booth = bs.find(b => b.id === boothId);
      const sponsor = sponsors.find(s => s.id === sponsorId);
      if (!booth || !sponsor) return bs;
      // Free previous booths held by this sponsor
      let next = bs.map(b => b.sponsorId === sponsorId
        ? { ...b, sponsorId: null, locked: false, partnerBoothId: null } : b);
      let partnerId = opts.partnerBoothId ?? null;
      if (sponsor.isDoubleBooth) {
        if (!partnerId) {
          const partner = pickPartnerBySetting(booth, next, settings.doubleBoothOrientation, opts.orientation);
          partnerId = partner?.id || null;
        }
        if (!partnerId) {
          const label = settings.doubleBoothOrientation === 'vertical'
            ? 'a vertically adjacent'
            : settings.doubleBoothOrientation === 'horizontal'
              ? 'a horizontally adjacent'
              : 'an adjacent';
          alert(`${sponsor.name} needs a double booth, but ${label} empty same-category booth was not found.`);
          return bs;
        }
      }
      next = next.map(b => {
        if (b.id === boothId) return { ...b, sponsorId, locked: !!opts.lock, partnerBoothId: partnerId };
        if (b.id === partnerId) return { ...b, sponsorId, locked: !!opts.lock, partnerBoothId: boothId };
        return b;
      });
      return next;
    });
  }, [sponsors, settings.doubleBoothOrientation]);

  const lockBoothForSponsor = useCallback((boothId, sponsorId, opts = {}) => {
    const sponsor = sponsors.find(s => s.id === sponsorId);
    if (!sponsor) return { ok: false, message: 'Sponsor not found.' };
    const booth = booths.find(b => b.id === boothId);
    if (!booth) return { ok: false, message: 'Booth not found.' };
    if (booth.levelId !== sponsor.levelId) return { ok: false, message: 'Category mismatch.' };
    if (booths.some(b => b.sponsorId === sponsorId && b.locked))
      return { ok: false, message: 'Sponsor already has a locked booth. Contact your meeting planner.' };
    if (settings.enforceSelectionOrder) {
      const ordered = sponsorsAtLevel(sponsor.levelId);
      for (const ahead of ordered) {
        if (ahead.id === sponsor.id) break;
        const aheadHas = booths.some(b => b.sponsorId === ahead.id);
        if (!aheadHas) return { ok: false, message: `Selection order is enforced: ${ahead.name} must be assigned a booth first.` };
      }
    }
    let partnerId = opts.partnerBoothId ?? null;
    if (sponsor.isDoubleBooth) {
      if (!partnerId) {
        const partner = pickPartnerBySetting(booth, booths, settings.doubleBoothOrientation, opts.orientation);
        partnerId = partner?.id || null;
      }
      if (!partnerId) {
        const label = settings.doubleBoothOrientation === 'vertical'
          ? 'vertically adjacent'
          : settings.doubleBoothOrientation === 'horizontal'
            ? 'horizontally adjacent'
            : 'adjacent';
        return { ok: false, message: `Double booth requires a ${label} empty same-category booth.` };
      }
    }
    setBooths(bs => bs.map(b => {
      if (b.id === boothId) return { ...b, sponsorId, locked: true, partnerBoothId: partnerId };
      if (b.id === partnerId) return { ...b, sponsorId, locked: true, partnerBoothId: boothId };
      return b;
    }));
    return { ok: true };
  }, [booths, sponsors, settings.enforceSelectionOrder, settings.doubleBoothOrientation, sponsorsAtLevel]);

  const unassignBooth = useCallback((boothId) => {
    setBooths(bs => {
      const target = bs.find(b => b.id === boothId);
      if (!target) return bs;
      return bs.map(b => {
        if (b.id === boothId || b.id === target.partnerBoothId)
          return { ...b, sponsorId: null, locked: false, partnerBoothId: null };
        return b;
      });
    });
  }, []);

  const createLevel = useCallback(() => {
    const l = { id: 'lvl-' + uid(), name: 'New Category', color: '#10B981' };
    setLevels(ls => [...ls, l]);
  }, []);
  const updateLevel = useCallback((id, patch) => {
    setLevels(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));
  }, []);
  const deleteLevel = useCallback((id) => {
    setLevels(ls => {
      if (ls.length <= 1) { alert('Cannot delete the last category.'); return ls; }
      const fallback = ls.find(l => l.id !== id);
      setBooths(bs => bs.map(b => b.levelId === id ? { ...b, levelId: fallback.id } : b));
      setSponsors(ss => ss.map(s => s.levelId === id ? { ...s, levelId: fallback.id } : s));
      return ls.filter(l => l.id !== id);
    });
  }, []);

  const updateSponsor = useCallback((id, patch) => {
    setSponsors(ss => ss.map(s => s.id === id ? { ...s, ...patch } : s));
  }, []);
  const reorderSponsors = useCallback((levelId, sponsorIds) => {
    setSponsors(ss => {
      const map = new Map(ss.map(s => [s.id, s]));
      sponsorIds.forEach((id, i) => {
        const sp = map.get(id);
        if (sp && sp.levelId === levelId) map.set(id, { ...sp, position: i });
      });
      return Array.from(map.values());
    });
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettings(s => ({ ...s, ...patch }));
  }, []);

  // Replace the sponsor list with an imported set. Callers pass an array of
  // objects already shaped as our sponsors (built via the mapper below).
  const replaceSponsors = useCallback((imported) => {
    setSponsors(imported);
    // Any assignments to sponsors we just removed are wiped from booths.
    const keepIds = new Set(imported.map(s => s.id));
    setBooths(bs => bs.map(b =>
      b.sponsorId && !keepIds.has(b.sponsorId)
        ? { ...b, sponsorId: null, locked: false, partnerBoothId: null }
        : b
    ));
  }, []);

  const startOver = useCallback(() => {
    setFloorPlan(null);
    setBooths([]);
    setSponsors(generateSampleSponsors(levels));
    setActiveSponsorId(null);
    setCurrentProjectId(null);
  }, [levels]);

  // -------- Project actions --------
  const saveCurrentAsProject = useCallback((name, existingId = null) => {
    if (!floorPlan) { alert('Upload a floor plan first before saving.'); return null; }
    const id = existingId || 'proj-' + uid();
    const record = {
      id, name: name.trim() || 'Untitled project',
      updatedAt: new Date().toISOString(),
      data: {
        floorPlan,
        booths,
        levels,
        sponsors,
        settings,
      },
    };
    let next;
    setProjects(prev => {
      const idx = prev.findIndex(p => p.id === id);
      next = idx === -1 ? [...prev, record] : prev.map(p => p.id === id ? record : p);
      return next;
    });
    // writeProjectsIndex is called with the "next" value on next microtask
    // — schedule it here so we persist before the next render.
    setTimeout(() => writeProjectsIndex(next), 0);
    setCurrentProjectId(id);
    return id;
  }, [floorPlan, booths, levels, sponsors, settings]);

  const loadProject = useCallback((id) => {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    // Deep-clone so subsequent edits don't mutate the stored copy
    const d = JSON.parse(JSON.stringify(p.data));
    setFloorPlan(d.floorPlan);
    setBooths(d.booths || []);
    setLevels(d.levels && d.levels.length ? d.levels : DEFAULT_LEVELS);
    setSponsors(d.sponsors || []);
    setSettings({ ...settings, ...(d.settings || {}) });
    setActiveSponsorId(null);
    setCurrentProjectId(id);
  }, [projects, settings]);

  const deleteProject = useCallback((id) => {
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      setTimeout(() => writeProjectsIndex(next), 0);
      return next;
    });
    if (currentProjectId === id) setCurrentProjectId(null);
  }, [currentProjectId]);

  const renameProject = useCallback((id, name) => {
    setProjects(prev => {
      const next = prev.map(p => p.id === id
        ? { ...p, name: name.trim() || p.name, updatedAt: new Date().toISOString() }
        : p);
      setTimeout(() => writeProjectsIndex(next), 0);
      return next;
    });
  }, []);

  return {
    role, setRole,
    floorPlan, booths, levels, sponsors, settings,
    activeSponsorId, setActiveSponsorId,
    levelById, sponsorById, boothById,
    boothsAtLevel, sponsorsAtLevel, unassignedSponsorsAtLevel,
    canSponsorPickNow,
    uploadFloorPlan, replaceFloorPlanImage, saveDetectedBooths,
    createBooth, updateBooth, deleteBooth,
    assignSponsor, lockBoothForSponsor, unassignBooth,
    createLevel, updateLevel, deleteLevel,
    updateSponsor, reorderSponsors, updateSettings, startOver,
    replaceSponsors,
    projects, currentProjectId, saveCurrentAsProject, loadProject, deleteProject, renameProject,
  };
}
