import { useEffect, useRef, useState } from 'react';
import { pages, asset, PDF_URL } from './catalog/data';
import { adjacentPage, swipeDecision, validPage, visiblePages } from './core/navigation';
import { readLocal, writeLocal } from './core/storage';
import { sound } from './core/sound';
import { useMedia } from './core/preferences';
import { CatalogPage } from './components/CatalogPage';
import { Icon } from './components/Icon';
import { Modal } from './components/Modal';
import { MagazineContext } from './components/MagazineContext';
function initialPage() {
  const requested = new URLSearchParams(location.search).get('page');
  return validPage(requested ?? readLocal('gorizont:last-page', '1'));
}
export default function App() {
  const [page, setPage] = useState(initialPage), [contents, setContents] = useState(false);
  const [turning, setTurning] = useState(false), [turnDirection, setTurnDirection] = useState(1);
  const [soundOn, setSoundOn] = useState(sound.enabled);
  const [quiet, setQuiet] = useState(() => readLocal('gorizont:quiet', 'off') === 'on');
  const spread = useMedia('(min-width: 1180px) and (min-height: 650px)');
  const systemReduced = useMedia('(prefers-reduced-motion: reduce)'), reduced = quiet || systemReduced;
  const shown = visiblePages(page, spread);
  const book = useRef<HTMLDivElement>(null), turn = useRef<HTMLDivElement>(null), timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gesture = useRef<{ x: number; y: number; time: number; width: number; pointer: string } | null>(null);
  const turningRef = useRef(false);
  function clearTurn() {
    if (timeout.current) clearTimeout(timeout.current);
    turningRef.current = false; setTurning(false); turn.current?.replaceChildren();
  }
  function changePage(next: number, history = true) {
    next = validPage(next);
    if (turningRef.current || (next === page && visiblePages(next, spread).join() === shown.join())) return;
    sound.stop();
    const direction = next > page ? 1 : -1;
    if (!reduced && book.current && turn.current) {
      const old = book.current.querySelector(direction > 0 ? '.catalog-page:last-child' : '.catalog-page:first-child')!;
      const clone = old.cloneNode(true) as HTMLElement;
      clone.removeAttribute('aria-label'); clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      const originalCanvas = old.querySelectorAll('canvas');
      clone.querySelectorAll('canvas').forEach((canvas, i) => {
        try { const image = document.createElement('img'); image.src = originalCanvas[i].toDataURL('image/webp', 0.75); image.className = 'canvas-snapshot'; canvas.replaceWith(image); } catch { canvas.remove(); }
      });
      clone.querySelectorAll('button,input,a').forEach(el => { el.setAttribute('tabindex', '-1'); el.removeAttribute('autofocus'); });
      turn.current.replaceChildren(clone);
      turningRef.current = true; setTurning(true); setTurnDirection(direction);
      timeout.current = setTimeout(clearTurn, 620);
    }
    setPage(next); writeLocal('gorizont:last-page', String(next));
    if (history) {
      const url = new URL(location.href); url.searchParams.set('page', String(next));
      window.history.pushState({ page: next }, '', url);
    }
  }
  function navigate(direction: 1 | -1) { changePage(adjacentPage(page, spread, direction)); }
  useEffect(() => {
    const url = new URL(location.href); url.searchParams.set('page', String(page)); history.replaceState({ page }, '', url);
    const onSound = () => setSoundOn(sound.enabled);
    window.addEventListener('gorizont:soundchange', onSound);
    return () => { if (timeout.current) clearTimeout(timeout.current); window.removeEventListener('gorizont:soundchange', onSound); };
  }, []);
  useEffect(() => {
    const pop = () => { clearTurn(); setPage(initialPage()); sound.stop(); };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (contents || document.querySelector('dialog[open]')) return;
      if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); navigate(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); navigate(-1); }
      if (event.key === 'Home') { event.preventDefault(); changePage(1); }
      if (event.key === 'End') { event.preventDefault(); changePage(11); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [page, spread, contents, reduced]);
  useEffect(() => { clearTurn(); }, [spread]);
  function down(event: React.PointerEvent) {
    const target = event.target as HTMLElement;
    if (turning || target.closest('[data-interactive],button,a,input,dialog')) return;
    if (event.pointerType === 'mouse' && !target.closest('.page-edge')) return;
    gesture.current = { x: event.clientX, y: event.clientY, time: performance.now(), width: book.current?.clientWidth ?? window.innerWidth, pointer: event.pointerType };
    if (event.pointerType === 'mouse') event.currentTarget.setPointerCapture(event.pointerId);
  }
  function up(event: React.PointerEvent) {
    const state = gesture.current; gesture.current = null;
    if (!state) return;
    const direction = swipeDecision(event.clientX - state.x, event.clientY - state.y, performance.now() - state.time, state.width / (spread ? 2 : 1));
    if (direction) navigate(direction as 1 | -1);
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else { setQuiet(true); writeLocal('gorizont:quiet', 'on'); }
    } catch { /* Fullscreen may be disabled by a host; navigation is unaffected. */ }
  }
  return <div className={`app ${reduced ? 'reduced-motion' : ''}`}>
    <a className="skip-link" href="#journal">Перейти к журналу</a>
    <header className="app-header"><button className="wordmark" onClick={() => changePage(1)} aria-label="GORIZONT — к обложке">GORIZONT<span>ФАБРИКА СКРЫТЫХ ДВЕРЕЙ</span></button><div className="header-right"><span>Интерактивный каталог <b>2026</b></span><a href="https://www.gorizont-doors.ru/" target="_blank" rel="noreferrer" aria-label="Открыть сайт фабрики"><Icon name="arrow" size={17} /></a></div></header>
    <main id="journal" className="journal-main">
      <div className="journal-meta"><span>Листайте. Открывайте. Исследуйте.</span><button className="quiet-toggle" aria-pressed={quiet} onClick={() => { setQuiet(q => !q); writeLocal('gorizont:quiet', !quiet ? 'on' : 'off'); }}><i className={quiet ? 'on' : ''} />Без лишнего движения</button></div>
      <div className="book-row">
        <button className="outside-arrow" onClick={() => navigate(-1)} disabled={shown[0] === 1 || turning} aria-label="Предыдущая страница"><Icon name="arrow" size={25} style={{ transform: 'rotate(180deg)' }} /></button>
        <div className={`book-stage ${shown.length > 1 ? 'spread' : 'single'} ${turning ? 'turning' : ''}`} onPointerDown={down} onPointerUp={up} onPointerCancel={() => { gesture.current = null; }}>
          <MagazineContext.Provider value={{ paused: turning, reduced }}>
            <div className="book" ref={book}>{shown.map(n => <CatalogPage key={n} number={n} onNavigate={changePage} />)}</div>
          </MagazineContext.Provider>
          <div className="page-edge left-edge" title="Потяните страницу" aria-hidden="true" /><div className="page-edge right-edge" title="Потяните страницу" aria-hidden="true" />
          <div className={`turn-layer ${turnDirection > 0 ? 'forward' : 'backward'} ${turning ? 'is-turning' : ''}`} ref={turn} aria-hidden="true" />
        </div>
        <button className="outside-arrow" onClick={() => navigate(1)} disabled={shown.at(-1) === 11 || turning} aria-label="Следующая страница"><Icon name="arrow" size={25} /></button>
      </div>
      <div className="reading-caption"><span className="reading-title">{shown.length > 1 ? 'GORIZONT / ' + pages[shown[0] - 1].short : pages[page - 1].short}</span><span className="reading-hint">Свайп — листать · Ручка — открыть дверь</span></div>
    </main>
    <nav className="toolbar" aria-label="Управление журналом">
      <button className="toolbar-item contents-button" onClick={() => setContents(true)} aria-label="Оглавление"><Icon name="grid" size={18} /><span>Оглавление</span></button>
      <div className="page-navigation"><button className="icon-button" onClick={() => navigate(-1)} disabled={shown[0] === 1 || turning} aria-label="Назад"><Icon name="chevron" size={17} style={{ transform: 'rotate(180deg)' }} /></button><span aria-live="polite" aria-atomic="true"><b>{shown.map(n => String(n).padStart(2, '0')).join(' — ')}</b><i>/</i>11</span><button className="icon-button" onClick={() => navigate(1)} disabled={shown.at(-1) === 11 || turning} aria-label="Вперёд"><Icon name="chevron" size={17} /></button></div>
      <div className="toolbar-tools"><button className={`toolbar-item ${soundOn ? 'enabled' : ''}`} onClick={() => { sound.setEnabled(!soundOn); setSoundOn(!soundOn); }} aria-pressed={soundOn} aria-label={soundOn ? 'Выключить звук' : 'Включить звук'}><Icon name={soundOn ? 'sound' : 'mute'} size={18} /><span>Звук {soundOn ? 'вкл' : 'выкл'}</span></button><button className="icon-button desktop-tool" onClick={fullscreen} aria-label="Полноэкранный просмотр"><Icon name="expand" size={17} /></button><a className="icon-button" href={PDF_URL} download aria-label="Скачать исходный PDF"><Icon name="download" size={18} /></a></div>
    </nav>
    <div className="page-progress" aria-hidden="true"><i style={{ width: `${(shown.at(-1)! / 11) * 100}%` }} /></div>
    {contents && <Modal title="Оглавление" onClose={() => setContents(false)} className="contents-modal"><h2>11 страниц.<br />Одно пространство.</h2><div className="contents-grid">{pages.map(p => <button key={p.number} className={shown.includes(p.number) ? 'selected' : ''} onClick={() => { setContents(false); changePage(p.number); }}><img src={asset('page-' + String(p.number).padStart(2, '0'))} alt="" loading="lazy" /><span><small>{String(p.number).padStart(2, '0')}</small>{p.title}</span></button>)}</div></Modal>}
  </div>;
}
