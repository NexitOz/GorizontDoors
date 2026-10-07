import { useEffect, useState } from 'react';
import { asset } from '../catalog/data';
import { sound } from '../core/sound';
import { readSession, writeSession } from '../core/storage';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { ImageViewer } from './Modal';
export function usePageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => (readSession('gorizont:page:' + key) as T | null) ?? initial);
  useEffect(() => { writeSession('gorizont:page:' + key, value); }, [key, value]);
  return [value, setValue] as const;
}
export function FactoryExplorer() {
  const [step, setStep] = usePageState('factory', 0);
  const items: { title: string; description: string; icon: IconName }[] = [
    { title: 'Собственное производство', description: 'Инженерная точность, премиальные материалы и внимание к деталям соединяются в единой дверной системе.', icon: 'factory' },
    { title: 'Контроль геометрии', description: 'Стабильный контроль качества на каждом этапе производства.', icon: 'shield' },
    { title: 'Индивидуальные решения', description: 'Решения для нестандартных проёмов. Высота до 2,7 м по каталогу.', icon: 'ruler' },
  ];
  return <div className="factory-explorer" data-interactive>
    <div className="feature-list">{items.map((item, index) => <button key={item.title} className={step === index ? 'active' : ''} onClick={() => setStep(index)} aria-pressed={step === index}><Icon name={item.icon} size={23} /><span>{item.title}</span><Icon name="arrow" size={17} /></button>)}</div>
    <div className="process-graphic" key={step}>
      <svg viewBox="0 0 320 155" role="img" aria-label={items[step].title}>
        <path d="M40 130h240" stroke="#c1b395" />
        <g className="process-panel"><path d="M110 18h100v112H110z" fill="#d8c9b2" stroke="#aa8958" /><path d="M124 30h72v90h-72z" fill="#f0e9dc" stroke="#aa8958" /><path d="M180 79h8" stroke="#363a34" strokeWidth="3" /></g>
        {step === 0 && <><g className="process-layer"><path d="m92 24 18-6v112l-18 6Z" fill="#be9b70" /><path d="m92 24 18-6 100 0-18 6Z" fill="#cdb999" /></g><path d="M65 90h25m-7-6 7 6-7 6" fill="none" stroke="#a88551" /></>}
        {step === 1 && <><path className="measure-line" d="M94 18v112M88 18h12m-12 112h12M110 6h100m-100-5v10m100-10v10" stroke="#a88551" fill="none" /><circle cx="251" cy="77" r="20" fill="#dbe1d4" /><path className="check-line" d="m241 77 7 7 13-16" fill="none" stroke="#5b7253" strokeWidth="2" /></>}
        {step === 2 && <><path className="process-layer" d="M98 14h124v120H98V14Zm8 8v112h108V22H106Z" fill="none" stroke="#a88551" strokeWidth="3" /><path d="M233 52h31m-7-6 7 6-7 6M233 104h31m-7-6 7 6-7 6" fill="none" stroke="#a88551" /></>}
      </svg>
      <span className="microcopy">Иллюстрация процесса</span>
    </div>
    <p className="factory-description">{items[step].description}</p>
  </div>;
}
const nodes = [
  { title: 'Цельноалюминиевый короб', image: 'profile', text: 'Анодированный алюминиевый профиль. Короб объединяет дверь и стену в единую плоскость.' },
  { title: 'Полотно скрытого монтажа', image: 'leaf', text: 'Облицовка MDF 6–8 мм по каталогу. Финишную поверхность можно интегрировать в отделку интерьера.' },
  { title: 'Магнитный замок', image: 'lock', text: 'Планка закреплена на торце полотна, ответная часть — на коробе. Освобождение защёлки предшествует открыванию.' },
  { title: 'Скрытые петли', image: 'hinge', text: 'Узел находится внутри короба и полотна. В каталоге указана 3D-регулировка; точный узел зависит от комплектации.' },
];
export function ConstructionNodes() {
  const [selected, setSelected] = usePageState('construction-node', 0), [image, setImage] = useState(false);
  const node = nodes[selected] ?? nodes[0];
  return <div className="construction-nodes" data-interactive><div className="node-tabs">{nodes.map((n, i) => <button key={n.title} onClick={() => setSelected(i)} aria-pressed={selected === i} className={selected === i ? 'active' : ''}><span>0{i + 1}</span>{n.title}</button>)}</div>
    <div className="node-detail"><button className="node-photo" onClick={() => setImage(true)} aria-label={`Увеличить ${node.title}`}><img src={asset(node.image)} alt={node.title} loading="lazy" /><Icon name="expand" size={17} /></button><p>{node.text}</p></div>
    {image && <ImageViewer title={node.title} src={asset(node.image)} onClose={() => setImage(false)} />}
  </div>;
}
export function AcousticExplorer() {
  const [selected, setSelected] = usePageState('acoustic', 0), [playing, setPlaying] = useState(false);
  const levels = [{ name: 'Standard', db: 35, desc: 'Базовый уровень' }, { name: 'Elite', db: 40, desc: 'Повышенная шумоизоляция' }, { name: 'Acoustic', db: 55, desc: 'Максимальная шумоизоляция' }];
  useEffect(() => () => sound.stop(), []);
  function play() {
    if (playing) { sound.stop(); setPlaying(false); return; }
    sound.setEnabled(true); window.dispatchEvent(new Event('gorizont:soundchange'));
    setPlaying(true); sound.demo(selected, () => setPlaying(false));
  }
  return <div className="acoustic-explorer" data-interactive>
    <div className="acoustic-levels">{levels.map((level, i) => <button key={level.name} aria-pressed={selected === i} className={selected === i ? 'active' : ''} onClick={() => { sound.stop(); setPlaying(false); setSelected(i); }}><span>{level.name}</span><strong>{level.db}<small>dB</small></strong><em>{level.desc}</em></button>)}</div>
    <div className={`soundwave ${playing ? 'playing' : ''}`} aria-hidden="true">{Array.from({ length: 59 }, (_, i) => <span key={i} style={{ height: `${6 + Math.abs(Math.sin(i * 1.4)) * Math.sin(i / 59 * Math.PI) * [58, 40, 20][selected]}px`, animationDelay: `${i * 0.024}s` }} />)}</div>
    <button className="primary-button listen-button" onClick={play}><Icon name={playing ? 'pause' : 'play'} size={17} />{playing ? 'Остановить' : 'Послушать иллюстрацию'}</button>
    <p className="microcopy acoustic-note">Иллюстрация. Звучание на устройстве не воспроизводит лабораторные показатели звукоизоляции. Значения — по каталогу.</p>
    <div className="rockwool"><img src={asset('rockwool')} alt="Каменная вата в исходном каталоге" loading="lazy" /><div><span className="eyebrow">ROCKWOOL</span><p>Натуральная каменная вата</p></div></div>
  </div>;
}
const optionItems = [
  { name: 'Скрытая ручка', image: 'hidden-handle', text: 'Ручка становится частью полотна. Демонстрация принципа, комплектация уточняется.' },
  { name: 'Автоматический порог', image: 'threshold', text: 'При закрытии порог опускается. При открытии поднимается и освобождает движение полотна.' },
  { name: 'Магнитный стопор', image: 'stopper', text: 'Стопор удерживает дверь в предусмотренном положении. Расположение зависит от монтажа.' },
  { name: 'Магнитный замок AGB', image: 'magnetic-lock', text: 'Магнитная защёлка фиксирует закрытую дверь. При нажатии ручки полотно освобождается.' },
  { name: 'Лаз для питомца', image: 'pet', text: 'Управляемая створка в нижней части полотна. Возможность установки согласовывается для выбранной модели.' },
  { name: 'Теневой плинтус', image: 'plinth', text: 'Аккуратная теневая линия на стыке стены и пола. В каталоге показаны Micro-maxi и Micro-mini.' },
];
export function OptionsExplorer() {
  const [selected, setSelected] = usePageState('option', 0), [active, setActive] = useState(false);
  const option = optionItems[selected] ?? optionItems[0];
  return <div className="options-explorer" data-interactive>
    <div className="options-grid">{optionItems.map((o, i) => <button key={o.name} className={selected === i ? 'active' : ''} onClick={() => { setSelected(i); setActive(false); }} aria-pressed={selected === i}><img src={asset(o.image)} alt="" loading="lazy" /><span>{o.name}</span></button>)}</div>
    <div className="option-demo"><OptionGraphic type={selected} active={active} /><div><h3>{option.name}</h3><p>{option.text}</p><button className="text-button" onClick={() => setActive(a => !a)}>{active ? 'Вернуть в исходное положение' : 'Показать работу'}<Icon name="arrow" size={16} /></button></div></div>
  </div>;
}
function OptionGraphic({ type, active }: { type: number; active: boolean }) {
  return <svg className={`option-graphic ${active ? 'active' : ''}`} viewBox="0 0 160 180" role="img" aria-label="Иллюстрация принципа работы">
    <path d="M20 155h125" stroke="#baaf9c" strokeWidth="2" />
    {type === 0 && <><path d="M42 14h78v141H42Z" fill="#ddd3c3" /><path className="option-handle" d="M106 63v38l-12-4V66l12-3Z" fill="#b39974" stroke="#92774f" style={{ transform: active ? 'translateX(-10px)' : '' }} /></>}
    {type === 1 && <><path d="M35 10h90v130H35Z" fill="#ddd3c3" /><path className="option-moving" d="M37 130h86v12H37Z" fill="#998c72" style={{ transform: active ? 'translateY(12px)' : '' }} /><path d="m77 115 5 7 5-7" fill="none" stroke="#92774f" /></>}
    {type === 2 && <><path d="M32 18h95v138H32Z" fill="#ddd3c3" /><circle cx="118" cy="35" r="6" fill="#444941" /><path className="option-moving" d="M108 35h10" stroke="#a88551" strokeWidth="6" style={{ transform: active ? 'translateX(7px)' : '' }} /><path d="M127 20h15v14h-15" fill="#b6aa92" /></>}
    {type === 3 && <><path d="M30 10h65v145H30Zm84 0h22v145h-22Z" fill="#ddd3c3" /><rect x="86" y="57" width="9" height="65" fill="#a19f92" /><path className="option-moving" d="M94 76h18v16H94Z" fill="#444941" style={{ transform: active ? 'translateX(-16px)' : '' }} /><path d="M119 70h8v28h-8Z" fill="#746c5e" /></>}
    {type === 4 && <><path d="M30 10h102v145H30Z" fill="#ddd3c3" /><path d="M57 95h50v60H57Z" fill="#5c5549" /><path className="option-moving" d="M60 98h44v53H60Z" fill="#b8ac95" style={{ transform: active ? 'perspective(180px) rotateX(65deg)' : '', transformOrigin: '82px 98px' }} /></>}
    {type === 5 && <><path d="M30 14h102v130H30Z" fill="#ddd3c3" /><path d="M30 144h102v10H30Z" fill="#524d43" /><path className="option-moving" d="M30 134h102v10H30Z" fill="#d0c6b5" style={{ transform: active ? 'translateY(-12px)' : '' }} /></>}
  </svg>;
}
export function SectionExplorer() {
  const [spread, setSpread] = usePageState('section', 0), [zoom, setZoom] = useState(false);
  return <div className="section-explorer" data-interactive>
    <button className="drawing-button" onClick={() => setZoom(true)} aria-label="Увеличить размерный чертёж"><img src={asset('drawing')} alt="Размерный чертёж профиля из финального каталога GORIZONT" loading="lazy" /><span><Icon name="expand" size={17} />Размерный чертёж</span></button>
    <div className="section-layers" style={{ '--spread': spread } as React.CSSProperties}><div className="wall-layer"><span>Стена</span></div><div className="frame-layer"><span>Короб</span></div><div className="leaf-layer"><span>Полотно</span></div></div>
    <label className="range-label">Раздвинуть слои<input type="range" min="0" max="1" step="0.01" value={spread} onChange={e => setSpread(Number(e.target.value))} aria-label="Раздвинуть слои системы" /></label>
    <p className="microcopy">Иллюстрация соединения. Размеры — на исходном чертеже.</p>
    {zoom && <ImageViewer title="Система в разрезе — исходный чертёж" src={asset('drawing')} onClose={() => setZoom(false)} />}
  </div>;
}
