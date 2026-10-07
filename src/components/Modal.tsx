import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
export function Modal({ title, onClose, children, className = '' }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!, previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`modal ${className}`} aria-label={title} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal-inner">
      <div className="modal-heading"><span className="eyebrow">{title}</span><button className="icon-button" onClick={onClose} aria-label="Закрыть"><Icon name="close" /></button></div>
      {children}
    </div>
  </dialog>;
}
export function ImageViewer({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1), [position, setPosition] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  function reset() { setZoom(1); setPosition({ x: 0, y: 0 }); }
  return <Modal title={title} onClose={onClose} className="image-modal">
    <div className="zoom-toolbar"><span>Масштаб {Math.round(zoom * 100)}%</span><input aria-label="Масштаб изображения" type="range" min="1" max="4" step="0.1" value={zoom} onChange={e => { setZoom(Number(e.target.value)); if (Number(e.target.value) === 1) setPosition({ x: 0, y: 0 }); }} /><button className="icon-button" onClick={reset} aria-label="Сбросить масштаб"><Icon name="reset" /></button></div>
    <div className="zoom-stage" data-interactive
      onWheel={e => setZoom(z => Math.max(1, Math.min(4, z - e.deltaY * 0.003)))}
      onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY, originX: position.x, originY: position.y }; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { if (drag.current && zoom > 1) setPosition({ x: drag.current.originX + e.clientX - drag.current.x, y: drag.current.originY + e.clientY - drag.current.y }); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <img src={src} alt={title} draggable={false} style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})` }} />
    </div>
    <p className="microcopy">Увеличьте и перетащите изображение, чтобы рассмотреть детали.</p>
  </Modal>;
}
