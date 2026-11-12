import type { MapPosition } from './types';

export const POI_CATEGORIES = {
  museum: { name: 'Музеи', symbol: '🏛️', color: '#8157c8' },
  cafe: { name: 'Кофейни', symbol: '☕', color: '#c67935' },
  theatre: { name: 'Театры', symbol: '🎭', color: '#d45183' },
  attraction: { name: 'Достопримечательности', symbol: '★', color: '#2479be' },
} as const;

export type PoiCategory = keyof typeof POI_CATEGORIES;
export const ALL_POI_CATEGORIES = Object.keys(POI_CATEGORIES) as PoiCategory[];
export type MapPoi = { id: string; name: string; category: PoiCategory; position: MapPosition };

/** Демонстрационные объекты из petrogradka_map_fixed.html; координаты [широта, долгота]. */
export const PETROGRADKA_POIS: MapPoi[] = [
  {
    id: 'petrogradka-0',
    name: 'Петропавловская крепость',
    category: 'attraction',
    position: [59.9503, 30.3138],
  },
  {
    id: 'petrogradka-1',
    name: 'Крейсер «Аврора»',
    category: 'attraction',
    position: [59.9554, 30.3375],
  },
  {
    id: 'petrogradka-2',
    name: 'Ботанический сад',
    category: 'attraction',
    position: [59.9712, 30.3236],
  },
  {
    id: 'petrogradka-3',
    name: 'Ленинградский зоопарк',
    category: 'attraction',
    position: [59.9536, 30.3075],
  },
  {
    id: 'petrogradka-4',
    name: 'Князь-Владимирский собор',
    category: 'attraction',
    position: [59.9515, 30.2971],
  },
  {
    id: 'petrogradka-5',
    name: 'Музей артиллерии',
    category: 'museum',
    position: [59.9546, 30.3133],
  },
  { id: 'petrogradka-6', name: 'Домик Петра I', category: 'museum', position: [59.9531, 30.3309] },
  {
    id: 'petrogradka-7',
    name: 'Музей политической истории',
    category: 'museum',
    position: [59.9558, 30.3243],
  },
  {
    id: 'petrogradka-8',
    name: 'Музей сновидений Фрейда',
    category: 'museum',
    position: [59.9652, 30.3035],
  },
  { id: 'petrogradka-9', name: 'Музей игрушки', category: 'museum', position: [59.9668, 30.3087] },
  {
    id: 'petrogradka-10',
    name: 'Балтийский дом',
    category: 'theatre',
    position: [59.9558, 30.3086],
  },
  { id: 'petrogradka-11', name: 'Мюзик-Холл', category: 'theatre', position: [59.9568, 30.3091] },
  {
    id: 'petrogradka-12',
    name: 'Театр «Лицедеи»',
    category: 'theatre',
    position: [59.9602, 30.2926],
  },
  {
    id: 'petrogradka-13',
    name: 'Кофейня на Каменноостровском',
    category: 'cafe',
    position: [59.966, 30.312],
  },
  {
    id: 'petrogradka-14',
    name: 'Кофейня у Горьковской',
    category: 'cafe',
    position: [59.956, 30.319],
  },
  {
    id: 'petrogradka-15',
    name: 'Кофейня на Большом',
    category: 'cafe',
    position: [59.961, 30.301],
  },
  {
    id: 'petrogradka-16',
    name: 'Кофейня на Левашовском',
    category: 'cafe',
    position: [59.971, 30.29],
  },
  {
    id: 'petrogradka-17',
    name: 'Кофейня у Ботанического сада',
    category: 'cafe',
    position: [59.969, 30.326],
  },
  {
    id: 'petrogradka-18',
    name: 'Кофейня на Петроградской',
    category: 'cafe',
    position: [59.965, 30.314],
  },
  {
    id: 'petrogradka-19',
    name: 'Кофейня у Чкаловской',
    category: 'cafe',
    position: [59.961, 30.292],
  },
  {
    id: 'petrogradka-20',
    name: 'Кофейня у зоопарка',
    category: 'cafe',
    position: [59.954, 30.307],
  },
  {
    id: 'petrogradka-21',
    name: 'Кофейня на Большой Пушкарской',
    category: 'cafe',
    position: [59.961, 30.307],
  },
];
