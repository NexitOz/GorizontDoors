import { useState } from 'react';
import type { Finish } from '../catalog/data';
import { asset, contacts, pages, PDF_URL } from '../catalog/data';
import { Icon } from './Icon';
import { DoorPanel } from './door/DoorPanel';
import { AcousticExplorer, ConstructionNodes, FactoryExplorer, OptionsExplorer, SectionExplorer, usePageState } from './Explorers';
import { ImageViewer } from './Modal';
export function CatalogPage({ number, onNavigate }: { number: number; onNavigate: (page: number) => void }) {
  const data = pages[number - 1];
  return <article className={`catalog-page page-${number} ${number === 1 ? 'cover-page' : ''}`} aria-label={`Страница ${number}: ${data.title}`} data-page={number}>
    {number === 1 ? <Cover onOpen={() => onNavigate(2)} /> : <>
      <header className="page-heading"><div className="eyebrow">{data.category}</div><h1>{data.title}</h1><div className="gold-rule"><i /></div></header>
      <div className="page-content"><PageContent number={number} onNavigate={onNavigate} /></div>
      <footer className="page-footer"><span>Современные скрытые двери<br />для вашего интерьера</span><i /><span className="folio">{String(number).padStart(2, '0')}</span></footer>
    </>}
  </article>;
}
function Cover({ onOpen }: { onOpen: () => void }) {
  return <><div className="cover-type"><div className="cover-topline"><span>Фабрика скрытых дверей</span><span>2026</span></div><h1>GORIZONT</h1><div className="gold-rule"><i /></div><p className="cover-title">Скрытые двери</p><p className="cover-subtitle">Интерактивный журнал</p></div>
    <div className="cover-image"><img src={asset('cover-interior')} alt="Скрытая дверь GORIZONT в светлом архитектурном интерьере из финального каталога" fetchPriority="high" /><div className="cover-quote">Архитектура,<br />которая становится<br />частью стены.</div></div>
    <div className="cover-bottom"><span>Invisible 42 / Reverse Premium 59</span><button className="cover-open" onClick={onOpen}>Открыть журнал<Icon name="arrow" size={20} /></button></div>
  </>;
}
function PageContent({ number, onNavigate }: { number: number; onNavigate: (page: number) => void }) {
  switch (number) {
    case 2: return <><p className="lead">Инженерная точность.<br />Архитектурная свобода.</p><p>GORIZONT — современное производство скрытых дверей. Мы создаём решения, которые становятся частью архитектуры и подчёркивают индивидуальность интерьера.</p><div className="factory-layout"><FactoryExplorer /><img className="factory-interior" src={asset('interior')} alt="Архитектурный интерьер из каталога" loading="lazy" /></div><div className="editorial-note"><Icon name="shield" />Берём заботу о вас после покупки</div></>;
    case 3: return <><p className="page-intro">Одна плоскость стены.<br />Два направления движения.</p><div className="opening-comparison"><DoorPanel id="compare-avers" mode="avers" compact /><DoorPanel id="compare-revers" mode="revers" compact /></div><div className="comparison-notes"><span><b>Invisible 42</b>Внешнее открывание</span><span><b>Reverse Premium 59</b>Внутреннее открывание</span></div><p className="microcopy">В обеих сценах вы смотрите с одной стороны стены. Avers идёт к вам, Revers — в пространство за проёмом.</p><div className="inline-links"><button onClick={() => onNavigate(4)}>Invisible 42<Icon name="arrow" size={16} /></button><button onClick={() => onNavigate(5)}>Reverse 59<Icon name="arrow" size={16} /></button></div></>;
    case 4: return <Collection mode="avers" />;
    case 5: return <Collection mode="revers" />;
    case 6: return <Finishes />;
    case 7: return <Construction />;
    case 8: return <><p className="lead">Тишина, которую<br />вы ощущаете каждый день.</p><AcousticExplorer /></>;
    case 9: return <><p className="page-intro">Детали, которые делают пространство удобнее.</p><OptionsExplorer /></>;
    case 10: return <><p>Скрытая дверная система объединяет стену, короб и полотно в единую плоскость. Алюминиевый короб обеспечивает жёсткость и стабильность геометрии.</p><SectionExplorer /><p className="closing-line">Гармония конструкции — в точности примыканий.</p></>;
    case 11: return <Contacts onNavigate={onNavigate} />;
    default: return null;
  }
}
function Collection({ mode }: { mode: 'avers' | 'revers' }) {
  return <><p className="page-intro">{mode === 'avers' ? 'Минималистичная интеграция в плоскость стены.' : 'Внутреннее открывание. Единая архитектурная линия.'}</p>
    <DoorPanel id={mode === 'avers' ? 'invisible' : 'reverse'} mode={mode} title={mode === 'avers' ? 'Invisible 42' : 'Reverse Premium 59'} materialControls />
    <div className="collection-facts"><span><Icon name="layers" size={19} />Алюминиевый короб</span><span><Icon name="lock" size={18} />Магнитный замок</span><span><Icon name="door" size={19} />Скрытые петли</span></div>
    {mode === 'revers' && <div className="dimension-note"><span>Толщина полотна</span><b>59 <small>мм</small></b></div>}
    <a className="contact-link" href={`mailto:${contacts.email}?subject=${encodeURIComponent('GORIZONT — ' + (mode === 'avers' ? 'Invisible 42' : 'Reverse Premium 59'))}`}>Обсудить эту дверь<Icon name="arrow" size={17} /></a>
  </>;
}
function Finishes() {
  const [selected, setSelected] = usePageState('finish', 1);
  const variants: { name: string; image: string; finish: Finish; text: string }[] = [
    { name: 'Зеркало', image: 'mirror', finish: 'mirror', text: 'Зеркальные полотна для визуального расширения пространства.' },
    { name: 'Шпон', image: 'veneer', finish: 'wood', text: 'Натуральный шпон и тактильная фактура.' },
    { name: 'RAL / NCS', image: 'paint', finish: 'graphite', text: 'Индивидуальная покраска в архитектурные оттенки.' },
    { name: 'Двустворчатая', image: 'double', finish: 'stone', text: 'Решения для широких проёмов. Принцип движения двух створок.' },
  ];
  const variant = variants[selected] ?? variants[1];
  const [paint, setPaint] = usePageState<Finish>('paint', 'graphite');
  return <><div className="finish-tabs" data-interactive>{variants.map((v, i) => <button key={v.name} onClick={() => setSelected(i)} aria-pressed={selected === i} className={selected === i ? 'active' : ''}><img src={asset(v.image)} alt="" loading="lazy" /><span>{v.name}</span></button>)}</div>
    <p className="page-intro finish-intro">{variant.text}</p>
    <DoorPanel key={selected} id={'finish-' + selected} mode="avers" initialFinish={selected === 2 ? paint : variant.finish} double={selected === 3} title={variant.name} />
    {selected === 2 && <div className="paint-samples" data-interactive>{[{ id: 'graphite', name: 'Графит', color: '#404e55' }, { id: 'terracotta', name: 'Терракота', color: '#a25f49' }, { id: 'stone', name: 'Тёплый камень', color: '#d3caba' }].map(p => <button key={p.id} className={paint === p.id ? 'active' : ''} aria-pressed={paint === p.id} onClick={() => setPaint(p.id as Finish)}><i style={{ background: p.color }} />{p.name}</button>)}</div>}
    <p className="microcopy">Цвет на экране может отличаться от образца. Отделку и совместимость уточните для вашего проекта.</p>
  </>;
}
function Construction() {
  const [explode, setExplode] = usePageState('explode', 0);
  return <><p className="page-intro">Технология, которую не видно,<br />но видно в каждой детали.</p><DoorPanel id="construction" mode="avers" compact exploded={explode} title="Дверная система" />
    <label className="range-label" data-interactive>Разобрать конструкцию<input aria-label="Разобрать конструкцию" type="range" min="0" max="1" step="0.01" value={explode} onChange={e => setExplode(Number(e.target.value))} /></label><ConstructionNodes /></>;
}
function Contacts({ onNavigate }: { onNavigate: (page: number) => void }) {
  const [image, setImage] = useState(false);
  return <><p className="lead">Ваш интерьер.<br />Наша точность.</p>
    <div className="partner-benefits"><div><span>До <strong>21%</strong></span><p>дизайнерам</p></div><div><span>До <strong>30%</strong></span><p>дилерам</p></div></div>
    <p className="microcopy">Условия программы уточняются при обращении.</p>
    <div className="contact-list"><a href={contacts.tel}><Icon name="phone" /><span>{contacts.phone}</span><Icon name="arrow" size={17} /></a><a href={`mailto:${contacts.email}`}><Icon name="mail" /><span>{contacts.email}</span><Icon name="arrow" size={17} /></a><a href={contacts.site} target="_blank" rel="noreferrer"><Icon name="door" /><span>gorizont-doors.ru</span><Icon name="arrow" size={17} /></a></div>
    <div className="addresses"><div><Icon name="pin" /><div><span className="small-label">Шоурум</span><p>{contacts.showroom}</p><a href={`https://yandex.ru/maps/?text=${encodeURIComponent(contacts.showroom)}`} target="_blank" rel="noreferrer">Открыть на карте</a></div></div><div><Icon name="factory" /><div><span className="small-label">Производство</span><p>{contacts.factory}</p></div></div></div>
    <a className="primary-button" href={contacts.tel}>Обсудить проект<Icon name="arrow" size={18} /></a>
    <div className="contact-bottom"><a href={PDF_URL} download><Icon name="download" size={16} />Скачать каталог PDF</a><button onClick={() => onNavigate(1)}>К обложке<Icon name="arrow" size={16} /></button></div>
    <button className="contact-art" aria-label="Рассмотреть интерьер" onClick={() => setImage(true)}><img src={asset('cover-interior')} alt="Интерьер со скрытой дверью GORIZONT" loading="lazy" /></button>
    {image && <ImageViewer title="Интерьер GORIZONT" src={asset('cover-interior')} onClose={() => setImage(false)} />}
  </>;
}
