export type OpeningMode = 'avers' | 'revers';
export type HingeSide = 'left' | 'right';
export type Finish = 'stone' | 'wood' | 'graphite' | 'terracotta' | 'mirror';
export const asset = (name: string) => `/assets/${name}.webp`;
export const PDF_URL = '/assets/GORIZONT_catalog_2026.pdf';
export const demoGeometry = {
  geometryStatus: 'illustrative', width: 0.9, height: 2.2,
  source: 'Proportions of the visual example, not manufacturing dimensions',
  aversThickness: 0.042, reversThickness: 0.059,
} as const;
export const pages = [
  { number: 1, title: 'Скрытые двери', short: 'Обложка', category: 'GORIZONT / 2026' },
  { number: 2, title: 'О фабрике GORIZONT', short: 'О фабрике', category: 'Философия' },
  { number: 3, title: 'Системы открывания', short: 'Avers и Revers', category: 'Два направления' },
  { number: 4, title: 'Invisible 42', short: 'Invisible 42', category: 'Коллекция / Avers' },
  { number: 5, title: 'Reverse Premium 59', short: 'Reverse 59', category: 'Коллекция / Revers' },
  { number: 6, title: 'Специальные решения и отделки', short: 'Отделки', category: 'Материалы' },
  { number: 7, title: 'Конструкция и комплектация', short: 'Конструкция', category: 'В каждой детали' },
  { number: 8, title: 'Акустика и практичность', short: 'Акустика', category: 'Комфорт' },
  { number: 9, title: 'Дополнительные опции', short: 'Опции', category: 'Дополняя пространство' },
  { number: 10, title: 'Система в разрезе', short: 'Система в разрезе', category: 'Архитектура' },
  { number: 11, title: 'Контакты', short: 'Контакты', category: 'Начнём ваш проект' },
] as const;
export const profiles = {
  avers: [
    { id: 'ABS', color: '#d9d3c7', label: 'Под покраску' },
    { id: 'ALU', color: '#aeb1b0', label: 'Алюминий' },
    { id: 'ALU BLACK', color: '#242824', label: 'Чёрный алюминий' },
    { id: 'GOLD', color: '#ba975d', label: 'Золото' },
  ],
  revers: [
    { id: 'ALU', color: '#aeb1b0', label: 'Алюминий' },
    { id: 'ALU BLACK', color: '#242824', label: 'Чёрный алюминий' },
    { id: 'GOLD BRASH', color: '#ba975d', label: 'Золотистый браш' },
    { id: 'GREY BRASH', color: '#747572', label: 'Серый браш' },
    { id: 'SHAMPAN', color: '#c9b999', label: 'Шампань' },
  ],
};
export const finishColors: Record<Finish, string> = {
  stone: '#d3caba', wood: '#9b704b', graphite: '#404e55',
  terracotta: '#a25f49', mirror: '#b8b5aa',
};
export const contacts = {
  phone: '+7 (977) 175-75-76', tel: 'tel:+79771757576',
  email: 'zakaz@gorizont-doors.ru',
  showroom: 'Москва, Волгоградский проспект, 32 к. 25, ТЦ «Метр Квадратный»',
  factory: 'Ногинск, Социалистическая ул., 4',
  site: 'https://www.gorizont-doors.ru/',
};
