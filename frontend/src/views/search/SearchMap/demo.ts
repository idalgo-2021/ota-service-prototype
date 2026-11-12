import type { SearchMapData } from './types';

export const demoMapData: SearchMapData = {
  city: 'Париж',
  center: [48.858, 2.345],
  hotels: [
    { id: 'demo-1', name: 'Les Lilas Serviced Apartments', position: [48.87, 2.31], price: 60201 },
    { id: 'demo-2', name: 'Pepper & Paper Apartments', position: [48.842, 2.349], price: 69525 },
    {
      id: 'demo-3',
      name: 'Résidence Bergère — Appartements',
      position: [48.875, 2.349],
      price: 36753,
    },
    { id: 'demo-4', name: 'Апартаменты у Лувра', position: [48.882, 2.355], price: 42062 },
    { id: 'demo-5', name: 'Отель у Сены', position: [48.846, 2.372], price: 49821 },
    { id: 'demo-6', name: 'Апартаменты Сен-Жермен', position: [48.842, 2.326], price: 37264 },
    { id: 'demo-7', name: 'Отель Берси', position: [48.834, 2.382], price: 30934 },
    { id: 'demo-8', name: 'Апартаменты у арены', position: [48.827, 2.365], price: 15926 },
    { id: 'demo-9', name: 'Отель у парка Берси', position: [48.825, 2.394], price: 48100 },
  ],
  points: [
    { id: 'arena', name: 'Accor Arena', position: [48.8386, 2.3786], kind: 'music' },
    { id: 'office', name: 'Офис · Rue de Rivoli 136', position: [48.8607, 2.3423], kind: 'office' },
    { id: 'station', name: 'Gare du Nord', position: [48.8809, 2.3553], kind: 'station' },
  ],
  districts: [
    {
      id: 'recommended',
      name: 'Рекомендуемый район (1–6 округа)',
      positions: [
        [
          [48.868, 2.304],
          [48.873, 2.319],
          [48.87, 2.333],
          [48.872, 2.351],
          [48.868, 2.368],
          [48.86, 2.377],
          [48.848, 2.378],
          [48.84, 2.365],
          [48.839, 2.35],
          [48.846, 2.332],
          [48.85, 2.319],
          [48.858, 2.306],
        ],
      ],
    },
  ],
  selectedDistrictIds: ['recommended'],
};
