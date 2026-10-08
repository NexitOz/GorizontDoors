import { useEffect, useId, useRef, useState } from 'react';
import type { Finish, HingeSide, OpeningMode } from '../../catalog/data';
import { finishColors, profiles } from '../../catalog/data';
import { clampAngle, DoorMotion, freeEdge, MAX_DEMO_ANGLE } from '../../core/door';
import { readSession, writeSession } from '../../core/storage';
import { sound } from '../../core/sound';
import { Icon } from '../Icon';
import { Modal } from '../Modal';
import { useMagazine } from '../MagazineContext';
import type { createDoorScene, SceneView } from './createScene';
type Engine = ReturnType<typeof createDoorScene>;
type Stored = { angle: number; secondAngle: number; profile: string; finish: Finish; hinge: HingeSide };
const cache = new Map<string, Stored>();
const detailViews: { id: SceneView; label: string; title: string; caption: string }[] = [
  { id: 'room', label: 'Общий вид', title: 'Дверь крупным планом', caption: 'Дверь открывается относительно показанной стороны стены.' },
  { id: 'edge', label: 'Кромка', title: 'Кромка полотна', caption: 'Цвет кромки соответствует выбранному профилю. Планка замка остаётся сатиновой.' },
  { id: 'lock', label: 'Замок', title: 'Магнитный замок', caption: 'Планка с винтами находится на торце полотна. При открытой двери магнитный язычок утоплен.' },
  { id: 'handle', label: 'Ручка', title: 'Сатиновая ручка', caption: 'Изогнутый рычаг на квадратной розетке. При нажатии движется ручка, розетка закреплена на полотне.' },
  { id: 'hinge', label: 'Петли', title: 'Скрытая петля', caption: 'Скрытая петля соединяет короб и полотно. Иллюстративная схема узла.' },
];
function saved(id: string, mode: OpeningMode, finish: Finish): Stored {
  if (cache.has(id)) return cache.get(id)!;
  const session = readSession('gorizont:door:' + id) as Partial<Stored> | null;
  const profile = profiles[mode].find(p => p.id === session?.profile)?.id ?? 'ALU BLACK';
  const validFinish: Finish[] = ['stone', 'wood', 'graphite', 'terracotta', 'mirror'];
  return { angle: clampAngle(session?.angle ?? 0), secondAngle: clampAngle(session?.secondAngle ?? 0), profile, finish: validFinish.includes(session?.finish as Finish) ? session!.finish! : finish, hinge: session?.hinge === 'right' ? 'right' : 'left' };
}
export function DoorPanel({ id, mode, compact = false, materialControls = false, initialFinish = 'stone', double = false, exploded = 0, title }: {
  id: string; mode: OpeningMode; compact?: boolean; materialControls?: boolean;
  initialFinish?: Finish; double?: boolean; exploded?: number; title?: string;
}) {
  const [state, setState] = useState(() => saved(id, mode, initialFinish));
  const [angle, setAngle] = useState(state.angle), [secondAngle, setSecondAngle] = useState(state.secondAngle);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [sceneVersion, setSceneVersion] = useState(0);
  const [detail, setDetail] = useState<SceneView | null>(null);
  const { paused, reduced } = useMagazine();
  const host = useRef<HTMLDivElement>(null), engine = useRef<Engine | null>(null);
  const motion = useRef(new DoorMotion(state.angle)), secondary = useRef(new DoorMotion(state.secondAngle));
  const frame = useRef(0), last = useRef(0), running = useRef(false);
  const pauseRef = useRef(paused), stateRef = useRef(state);
  const drag = useRef<{ x: number; y: number; start: number; moved: boolean } | null>(null);
  stateRef.current = state; pauseRef.current = paused;
  function persist() {
    const current = { ...stateRef.current, angle: motion.current.angle, secondAngle: secondary.current.angle };
    cache.set(id, current); writeSession('gorizont:door:' + id, current);
  }
  function refresh() {
    engine.current?.update(motion.current.angle, motion.current.handlePressed, secondary.current.angle);
    setAngle(motion.current.angle); setSecondAngle(secondary.current.angle);
    if (host.current) { host.current.dataset.angle = motion.current.angle.toFixed(2); host.current.dataset.phase = motion.current.phase; }
  }
  function stop() { cancelAnimationFrame(frame.current); running.current = false; last.current = 0; }
  function animate(now: number) {
    if (pauseRef.current || document.hidden) { stop(); persist(); return; }
    const dt = last.current ? (now - last.current) / 1000 : 0;
    last.current = now;
    for (const event of motion.current.tick(dt)) sound.play(event);
    // Only one physical click for a twin-leaf demonstration.
    secondary.current.tick(dt); refresh();
    if (motion.current.moving || secondary.current.moving) frame.current = requestAnimationFrame(animate);
    else { stop(); persist(); }
  }
  function start() { if (!running.current && !pauseRef.current && !document.hidden) { running.current = true; frame.current = requestAnimationFrame(animate); } }
  function command(value: number, immediate = reduced, second = false) {
    if (pauseRef.current) return;
    sound.activate();
    const m = second ? secondary.current : motion.current;
    for (const event of m.command(value, immediate)) sound.play(event);
    if (immediate) { refresh(); persist(); } else start();
  }
  useEffect(() => {
    let cancelled = false, created: Engine | null = null;
    stop(); setStatus('loading');
    const load = async () => {
      try {
        const module = await import('./createScene');
        if (cancelled || !host.current) return;
        created = module.createDoorScene(host.current, { mode, hinge: state.hinge, finish: state.finish, profile: profiles[mode].find(p => p.id === state.profile)!.color, double });
        engine.current = created; created.setExploded(exploded);
        created.update(motion.current.angle, false, secondary.current.angle);
        setStatus('ready');
        const canvas = created.renderer.domElement;
        canvas.addEventListener('webglcontextlost', lost);
      } catch { if (!cancelled) setStatus('fallback'); }
    };
    function lost(e: Event) { e.preventDefault(); stop(); setStatus('fallback'); }
    void load();
    return () => {
      cancelled = true; stop(); persist();
      created?.renderer.domElement.removeEventListener('webglcontextlost', lost);
      created?.dispose(); if (engine.current === created) engine.current = null;
    };
  }, [id, mode, state.hinge, double, sceneVersion]);
  useEffect(() => {
    engine.current?.setMaterial(state.finish, profiles[mode].find(p => p.id === state.profile)!.color); persist();
  }, [state.finish, state.profile]);
  useEffect(() => {
    if (initialFinish !== state.finish) setState(s => ({ ...s, finish: initialFinish }));
  }, [initialFinish]);
  useEffect(() => { engine.current?.setExploded(exploded); }, [exploded]);
  useEffect(() => {
    if (paused) stop(); else start();
  }, [paused]);
  useEffect(() => {
    const listener = () => { if (document.hidden) { stop(); persist(); } else start(); };
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  }, []);
  function changeHinge(hinge: HingeSide) {
    motion.current.command(0, true); secondary.current.command(0, true); refresh();
    setState(s => ({ ...s, hinge }));
  }
  function pointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (paused || detail || (engine.current && !engine.current.hit(e.clientX, e.clientY))) return;
    drag.current = { x: e.clientX, y: e.clientY, start: motion.current.angle, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current; if (!current) return;
    const dx = e.clientX - current.x;
    if (Math.abs(dx) > 9) current.moved = true;
    if (current.moved) {
      const direction = (state.hinge === 'left' ? 1 : -1) * (mode === 'avers' ? 1 : -1);
      command(current.start + dx / Math.max(200, e.currentTarget.clientWidth) * 140 * direction, true);
    }
  }
  function pointerUp() {
    const current = drag.current; if (!current) return;
    if (!current.moved) command(motion.current.target > 2 ? 0 : 72);
    drag.current = null; persist();
  }
  const panelTitle = title ?? (mode === 'avers' ? 'Avers' : 'Revers');
  return <section className={`door-panel ${compact ? 'compact' : ''}`} aria-label={`${panelTitle} — интерактивная дверь`} data-interactive>
    <div className="scene-heading"><span>{panelTitle}</span><span className="direction-label">{mode === 'avers' ? 'На себя' : 'От себя'}</span></div>
    <div className="scene-wrap">
      <div className="scene-host" ref={host} data-testid={`scene-${id}`} data-angle={angle.toFixed(2)} data-mode={mode} data-hinge={state.hinge}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
        onPointerCancel={() => { drag.current = null; persist(); }}>
        {status !== 'ready' && <div className="scene-fallback"><FallbackDoor angle={angle} mode={mode} hinge={state.hinge} profile={profiles[mode].find(p => p.id === state.profile)!.color} finish={state.finish} /><span className="scene-status">{status === 'loading' ? 'Подготавливаем интерьер…' : 'Просмотр схемы двери'}</span></div>}
      </div>
      <button className="scene-expand icon-button" aria-label={`Увеличить ${panelTitle}`} onClick={() => setDetail('room')}><Icon name="expand" size={17} /></button>
      <span className="scene-caption">Нажмите на ручку или потяните дверь</span>
    </div>
    {status === 'fallback' && <button className="quiet-button" onClick={() => setSceneVersion(v => v + 1)}>Восстановить 3D-просмотр</button>}
    <div className="door-actions"><button className="text-button" onClick={() => command(motion.current.target > 2 ? 0 : 72)} disabled={paused}><Icon name="door" size={17} />{motion.current.target > 2 ? 'Закрыть' : 'Открыть'}</button><span className="angle-value">{Math.round(angle)}°</span></div>
    <input className="angle-slider" aria-label={`Угол открытия ${panelTitle}`} aria-valuetext={`${Math.round(angle)} градусов, ${mode === 'avers' ? 'на себя' : 'от себя'}`} type="range" min="0" max={MAX_DEMO_ANGLE} value={angle} onChange={e => command(Number(e.target.value), true)} disabled={paused} />
    {double && <div className="secondary-controls"><label>Вторая створка <span>{Math.round(secondAngle)}°</span><input aria-label="Угол второй створки" type="range" min="0" max={MAX_DEMO_ANGLE} value={secondAngle} onChange={e => command(Number(e.target.value), true, true)} /></label></div>}
    <TopView angle={angle} mode={mode} hinge={state.hinge} />
    {!compact && <div className="door-details"><button className="quiet-button" onClick={() => { command(58, true); setDetail('lock'); }}><Icon name="lock" size={15} />Посмотреть замок</button><button className="quiet-button" onClick={() => { command(58, true); setDetail('edge'); }}>Кромка</button><button className="quiet-button" onClick={() => { command(58, true); setDetail('handle'); }}>Ручка</button><button className="quiet-button" onClick={() => { command(58, true); setDetail('hinge'); }}>Петли</button>{!double && <button className="quiet-button" onClick={() => changeHinge(state.hinge === 'left' ? 'right' : 'left')} aria-label="Поменять сторону петель">Петли {state.hinge === 'left' ? 'слева' : 'справа'}</button>}</div>}
    {materialControls && <div className="profile-controls"><span className="small-label">Профиль и кромка <b>{state.profile}</b></span><div className="profile-swatches">{profiles[mode].map(p => <button key={p.id} className={`swatch ${state.profile === p.id ? 'selected' : ''}`} style={{ '--swatch': p.color } as React.CSSProperties} aria-label={p.id} aria-pressed={state.profile === p.id} title={p.label} onClick={() => setState(s => ({ ...s, profile: p.id }))}><span /></button>)}</div></div>}
    {detail && <Modal title={detailViews.find(v => v.id === detail)!.title} onClose={() => setDetail(null)} className="door-modal">
      <div className="detail-tabs" role="group" aria-label="Ракурс двери">{detailViews.map(v => <button key={v.id} aria-pressed={detail === v.id} onClick={() => setDetail(v.id)}>{v.label}</button>)}</div>
      <DoorDetail mode={mode} hinge={state.hinge} profile={profiles[mode].find(p => p.id === state.profile)!.color} finish={state.finish} view={detail} />
      <p className="microcopy">{detailViews.find(v => v.id === detail)!.caption}</p>
    </Modal>}
  </section>;
}
function DoorDetail({ mode, hinge, profile, finish, view }: { mode: OpeningMode; hinge: HingeSide; profile: string; finish: Finish; view: SceneView }) {
  const ref = useRef<HTMLDivElement>(null), engine = useRef<Engine | null>(null);
  const [angle, setAngle] = useState(view === 'room' ? 65 : 58);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const lost = (event: Event) => { event.preventDefault(); setReady(false); };
    void import('./createScene').then(m => {
      if (cancelled || !ref.current) return;
      try {
        engine.current = m.createDoorScene(ref.current, { mode, hinge, profile, finish });
        engine.current.update(angle, false); engine.current.setView(view);
        engine.current.renderer.domElement.addEventListener('webglcontextlost', lost);
        setReady(true);
      } catch { setReady(false); }
    });
    return () => {
      cancelled = true;
      engine.current?.renderer.domElement.removeEventListener('webglcontextlost', lost);
      engine.current?.dispose(); engine.current = null;
    };
  }, []);
  useEffect(() => { engine.current?.setView(view); }, [view, ready]);
  return <><div className="detail-canvas" ref={ref}>{!ready && <div className="scene-fallback"><FallbackDoor angle={angle} mode={mode} hinge={hinge} profile={profile} finish={finish} view={view} /><span className="scene-status">Схема открывания двери</span></div>}</div><label className="detail-slider">Угол {angle}°<input aria-label="Угол двери в увеличенном просмотре" type="range" min="0" max={MAX_DEMO_ANGLE} value={angle} onChange={e => { const value = Number(e.target.value); setAngle(value); engine.current?.update(value, false); }} /></label></>;
}
export function TopView({ angle, mode, hinge }: { angle: number; mode: OpeningMode; hinge: HingeSide }) {
  const edge = freeEdge(angle, mode, hinge);
  const sx = (x: number) => 110 + x * 100, sy = (z: number) => 38 + z * 36;
  return <svg className="top-view" viewBox="0 0 220 80" aria-label={`Вид сверху, ${mode === 'avers' ? 'на себя' : 'от себя'}`} role="img">
    <path d="M12 31h48v14H12zm148 0h48v14h-48" fill="currentColor" opacity=".11" />
    <path d="M60 38h100" stroke="currentColor" strokeDasharray="3 4" opacity=".35" />
    <line x1={sx(hinge === 'left' ? -0.45 : 0.45)} y1="38" x2={sx(edge.x)} y2={sy(edge.z)} stroke="#a88551" strokeWidth="3" strokeLinecap="round" />
    <circle cx={sx(hinge === 'left' ? -0.45 : 0.45)} cy="38" r="3" fill="#a88551" />
    <text x="110" y="76" textAnchor="middle" fontSize="9" fill="currentColor">ВИД СВЕРХУ</text>
  </svg>;
}
function FallbackDoor({ angle, mode, hinge, profile, finish, view = 'room' }: { angle: number; mode: OpeningMode; hinge: HingeSide; profile: string; finish: Finish; view?: SceneView }) {
  const steel = useId().replaceAll(':', ''), edge = freeEdge(angle, mode, hinge), scale = 140;
  const pivot = 150 + (hinge === 'left' ? -0.45 : 0.45) * scale;
  const top = mode === 'avers' ? 45 - edge.z * 15 : 45 + Math.abs(edge.z) * 12;
  const x = 150 + edge.x * scale, bottom = mode === 'avers' ? 250 + edge.z * 15 : 250 - Math.abs(edge.z) * 12;
  const inward = hinge === 'left' ? -1 : 1, edgeWidth = mode === 'revers' ? 7 : 5;
  const close = view === 'lock' || view === 'handle';
  return <svg viewBox="0 0 300 300" aria-label="Схема двери, кромки и фурнитуры">
    <defs><linearGradient id={steel} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f1f3f3" /><stop offset=".35" stopColor="#9da7ac" /><stop offset=".55" stopColor="#e3e7e8" /><stop offset="1" stopColor="#737e85" /></linearGradient></defs>
    <rect width="300" height="300" fill="#d8d0c2" />
    {close ? <>
      <path d="M90 0h210v300H90z" fill={finishColors[finish]} />
      <path d="M56 0h34v300H56z" fill={profile} />
      <rect x="66" y="29" width="15" height="240" rx="7" fill={`url(#${steel})`} stroke="#677279" strokeWidth=".7" />
      <rect x="69" y="132" width="9" height="36" rx="1" fill="#252c2f" />
      {[43, 255].map(y => <g key={y}><circle cx="73.5" cy={y} r="3.1" fill="#bac2c6" /><path d={`M71 ${y}h5m-2.5-2.5v5`} stroke="#566167" strokeWidth=".8" /></g>)}
      <rect x="105" y="115" width="38" height="38" rx="1" fill={`url(#${steel})`} stroke="#7a8589" />
      <circle cx="124" cy="134" r="8" fill={`url(#${steel})`} />
      <path d="M124 134q14 13 33 10l64-10q8-3 9-9l-5-4-66 12q-16 1-29-6z" fill={`url(#${steel})`} stroke="#6d7a81" strokeWidth=".8" />
    </> : <>
      <rect x="84" y="42" width="132" height="211" fill={profile} />
      <rect x="87" y="45" width="126" height="205" fill="#625b4e" />
      <polygon points={`${pivot},45 ${x},${top} ${x},${bottom} ${pivot},250`} fill={finishColors[finish]} stroke={profile} strokeWidth="1.5" />
      <polygon points={`${x},${top} ${x + inward * edgeWidth},${top + 1} ${x + inward * edgeWidth},${bottom - 1} ${x},${bottom}`} fill={profile} />
      {angle > 6 && <rect x={x + inward * edgeWidth / 2 - 1.5} y="143" width="3" height="29" rx="1.3" fill={`url(#${steel})`} />}
      <rect x={x + inward * 10 - 3.3} y="158" width="6.6" height="7" rx=".4" fill={`url(#${steel})`} />
      <path d={`M${x + inward * 10} 162q${inward * 4} 3 ${inward * 8} 2l${inward * 11}-2`} stroke={`url(#${steel})`} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M0 250h300" stroke="#a79d8a" />
    </>}
  </svg>;
}
