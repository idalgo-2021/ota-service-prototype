import type { Guests } from './api';
import { formatCount } from './format';

/** Параметры поездки в адресе страниц поиска и объекта. */
export type StayQuery = {
  checkin?: string;
  checkout?: string;
  adults?: string;
  children?: string;
  pets?: string;
};

/** Поездка: даты `YYYY-MM-DD`, если выбраны, и состав гостей. */
export type Stay = {
  checkin?: string;
  checkout?: string;
  guests: Guests;
};

export const DEFAULT_GUESTS: Guests = { adults: 1, children: 0, pets: false };

export const MAX_ADULTS = 10;
export const MAX_CHILDREN = 6;

const toCount = (raw: string | undefined, min: number, max: number, fallback: number) => {
  const value = Number(raw);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
};

/** Гости из адреса; кривые и отсутствующие значения заменяем значениями по умолчанию. */
export const parseGuests = ({ adults, children, pets }: StayQuery): Guests => ({
  adults: toCount(adults, 1, MAX_ADULTS, DEFAULT_GUESTS.adults),
  children: toCount(children, 0, MAX_CHILDREN, DEFAULT_GUESTS.children),
  pets: pets === '1',
});

/** Число ночей между датами `YYYY-MM-DD`, если это допустимая поездка (от 1 до 365 ночей). */
export const getNights = (checkin?: string, checkout?: string) => {
  if (!checkin || !checkout) {
    return undefined;
  }
  const start = Date.parse(`${checkin}T00:00:00Z`);
  const end = Date.parse(`${checkout}T00:00:00Z`);
  const nights = (end - start) / 86_400_000;
  return Number.isInteger(nights) && nights >= 1 && nights <= 365 ? nights : undefined;
};

/** Поездка из параметров адреса. */
export const parseStay = (query: StayQuery): Stay => ({
  checkin: query.checkin,
  checkout: query.checkout,
  guests: parseGuests(query),
});

/** Параметры поездки для адреса: даты, если выбраны, и гости. */
export const toStayParams = ({ checkin, checkout, guests }: Stay) => {
  const params = new URLSearchParams();
  if (checkin) {
    params.set('checkin', checkin);
  }
  if (checkout) {
    params.set('checkout', checkout);
  }
  params.set('adults', String(guests.adults));
  if (guests.children) {
    params.set('children', String(guests.children));
  }
  if (guests.pets) {
    params.set('pets', '1');
  }
  return params;
};

export const formatNights = (nights: number) => formatCount(nights, ['ночь', 'ночи', 'ночей']);

/** Состав гостей словами: «2 взрослых, 1 ребёнок, с питомцем». */
export const formatGuests = ({ adults, children, pets }: Guests, lang: 'ru' | 'en' = 'ru') =>
  lang === 'en'
    ? [
        `${adults} ${adults === 1 ? 'adult' : 'adults'}`,
        children ? `${children} ${children === 1 ? 'child' : 'children'}` : null,
        pets ? 'with a pet' : null,
      ]
        .filter(Boolean)
        .join(', ')
    : [
        formatCount(adults, ['взрослый', 'взрослых', 'взрослых']),
        children ? formatCount(children, ['ребенок', 'ребенка', 'детей']) : null,
        pets ? 'с питомцем' : null,
      ]
        .filter(Boolean)
        .join(', ');

/** Для подписи цены, рассчитанной на состав гостей: «за двоих взрослых и одного ребёнка». */
export const formatGuestsForPrice = ({ adults, children }: Pick<Guests, 'adults' | 'children'>) => {
  const people = (count: number, singular: string, plural: string) =>
    count === 1 ? `одного ${singular}` : count === 2 ? `двоих ${plural}` : `${count} ${plural}`;
  return `за ${people(adults, 'взрослого', 'взрослых')}${
    children ? ` и ${people(children, 'ребенка', 'детей')}` : ''
  }`;
};
