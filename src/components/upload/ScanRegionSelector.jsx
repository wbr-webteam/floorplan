import { useRef, useState, useEffect } from 'react';

export function ScanRegionSelector({ imageSrc, imageWidth, imageHeight, region, onChangeRegion }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [drag, setDrag] = useState(null);
  const [dragRect, setDragRect] = useState(null);

  useEffect(() => {
    const fit = () => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      const s = Math.min(r.width / imageWidth, r.height / imageHeight, 1);
      setSize({ w: imageWidth * s, h: imageHeight * s, scale: s });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [imageWidth, imageHeight]);

  const scale = size.scale || 1;
  const screenToImage = (cx, cy) => {
    const r = containerRef.current.getBoundingClientRect();
    return { x: (cx - r.left) / scale, y: (cy - r.top) / scale };
  };

  const onMouseDown = (e) => {
    const p = screenToImage(e.clientX, e.clientY);
    setDrag(p);
    setDragRect({ x: p.x, y: p.y, width: 0, height: 0 });
  };
  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      const p = screenToImage(e.clientX, e.clientY);
      setDragRect({
        x: Math.min(drag.x, p.x), y: Math.min(drag.y, p.y),
        width: Math.abs(p.x - drag.x), height: Math.abs(p.y - drag.y),
      });
    };
    const onUp = () => {
      if (dragRect && dragRect.width > 10 && dragRect.height > 10) {
        onChangeRegion(dragRect);
      }
      setDrag(null); setDragRect(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drag, dragRect]);

  return (
    <div ref={containerRef} className="flex-1 bg-gray-100 relative overflow-hidden" onMouseDown={onMouseDown}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: size.w, height: size.h }}>
        <img src={imageSrc} alt="floor plan" draggable={false}
             style={{ width: size.w, height: size.h, display: 'block', userSelect: 'none' }} />
        <svg width={size.w} height={size.h} viewBox={`0 0 ${imageWidth} ${imageHeight}`}
             style={{ position: 'absolute', left: 0, top: 0 }}>
          {region && <rect x={region.x} y={region.y} width={region.width} height={region.height} className="region-overlay" />}
          {dragRect && <rect x={dragRect.x} y={dragRect.y} width={dragRect.width} height={dragRect.height} className="region-overlay" />}
        </svg>
      </div>
    </div>
  );
}
