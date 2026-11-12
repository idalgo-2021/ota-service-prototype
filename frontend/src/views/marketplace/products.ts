import type { Product, ProductType, TourScheduleEntry } from '@/lib/api';
import { formatCount, formatMoney } from '@/lib/format';

const TYPE_LABELS: Record<ProductType, string> = {
  tour: 'Экскурсия',
  service: 'Услуга',
  goods: 'Товар',
};

// Для услуг продавец уточняет вид в характеристиках — он понятнее общего «Услуга».
const SERVICE_LABELS: Record<string, string> = {
  transfer: 'Трансфер',
  insurance: 'Страховка',
};

/** Вид предложения для подписи над названием: «Экскурсия», «Трансфер», «Товар». */
export const getTypeLabel = ({ product_type, attributes }: Product) =>
  (product_type === 'service' && SERVICE_LABELS[attributes.service_type]) ||
  TYPE_LABELS[product_type];

const FORMATS: Record<string, string> = {
  group: 'в группе',
  small_group: 'мини-группа',
  individual: 'индивидуально',
};

const LANGUAGES: Record<string, string> = {
  ru: 'на русском',
  en: 'на английском',
};

const VEHICLE_CLASSES: Record<string, string> = {
  economy: 'эконом',
  comfort: 'комфорт',
  business: 'бизнес-класс',
  minivan: 'минивэн',
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours} ч` : null, rest ? `${rest} мин` : null].filter(Boolean).join(' ');
};

const toNumber = (value: string) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
};

/**
 * Характеристики продавца словами для карточки: «3 ч · в группе · на русском».
 * Характеристики хранятся в свободной форме, поэтому показываем только знакомые ключи.
 */
export const getProductFacts = ({ attributes, currency }: Product) => {
  const facts = Object.entries(attributes).map(([key, value]) => {
    const number = toNumber(value);
    switch (key) {
      case 'duration_minutes':
        return number ? formatDuration(number) : undefined;
      case 'format':
        return FORMATS[value];
      case 'language':
        return LANGUAGES[value];
      case 'vehicle_class':
        return VEHICLE_CLASSES[value];
      case 'passengers_max':
        return number
          ? `до ${formatCount(number, ['пассажира', 'пассажиров', 'пассажиров'])}`
          : undefined;
      case 'booking_notice_hours':
        return number ? `заказ за ${number} ч` : undefined;
      case 'coverage_amount':
        return number ? `покрытие ${formatMoney(number, currency)}` : undefined;
      case 'coverage_days':
        return value === '1' ? 'на 1 день' : `на ${value.replace('-', '–')} дней`;
      case 'age_limit':
        return number ? `до ${number} лет` : undefined;
      case 'items_count':
        return number ? `${number} шт.` : undefined;
      case 'weight_kg':
        return `${value.replace('.', ',')} кг`;
      case 'meeting_point':
        return `сбор: ${value}`;
      case 'included':
        return `включено: ${value}`;
      default:
        return undefined;
    }
  });
  return facts.filter((fact) => fact !== undefined);
};

/** Даты поездки `YYYY-MM-DD`, в которые показываем подходящие экскурсии. */
export type TripDates = {
  from: string;
  to: string;
};

/** Дата экскурсии для выбора: `YYYY-MM-DD` и подпись «вт, 3 нояб. · 10:00». */
export type TourDate = {
  value: string;
  label: string;
};

const DAY_MS = 86_400_000;

// Без поездки предлагаем экскурсии на ближайшие четыре недели.
const DEFAULT_RANGE_DAYS = 28;

const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);

const dateLabel = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const WEEKDAYS: Record<number, string> = {
  1: 'понедельникам',
  2: 'вторникам',
  3: 'средам',
  4: 'четвергам',
  5: 'пятницам',
  6: 'субботам',
  7: 'воскресеньям',
};

const joinWords = (words: string[]) =>
  words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} и ${words.at(-1)}`;

/** Расписание словами: «По вторникам и субботам в 09:00». */
export const formatTourSchedule = (schedule: TourScheduleEntry[]) => {
  const byTime = new Map<string, number[]>();
  schedule.forEach(({ weekday, time }) => {
    byTime.set(time, [...(byTime.get(time) ?? []), weekday]);
  });
  return [...byTime.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([time, weekdays]) => {
      const days = [...new Set(weekdays)]
        .sort((left, right) => left - right)
        .map((weekday) => WEEKDAYS[weekday])
        .filter(Boolean);
      return days.length ? `По ${joinWords(days)} в ${time}` : undefined;
    })
    .filter(Boolean)
    .join('; ');
};

/**
 * Даты, на которые можно записаться на экскурсию по её расписанию: в дни поездки,
 * а без поездки — в ближайшие четыре недели. Прошедшие дни не предлагаем.
 */
export const getTourDates = (schedule: TourScheduleEntry[], trip?: TripDates): TourDate[] => {
  const today = Date.parse(`${toIso(Date.now())}T00:00:00Z`);
  const start = Math.max(today, trip ? Date.parse(`${trip.from}T00:00:00Z`) : today + DAY_MS);
  const end = trip ? Date.parse(`${trip.to}T00:00:00Z`) : start + (DEFAULT_RANGE_DAYS - 1) * DAY_MS;

  const dates: TourDate[] = [];
  for (let time = start; time <= end; time += DAY_MS) {
    // В расписании понедельник — 1, воскресенье — 7; у `getUTCDay` воскресенье — 0.
    const weekday = new Date(time).getUTCDay() || 7;
    const times = schedule
      .filter((slot) => slot.weekday === weekday)
      .map((slot) => slot.time)
      .sort();
    if (times.length) {
      dates.push({
        value: toIso(time),
        label: `${dateLabel.format(time)} · ${times.join(', ')}`,
      });
    }
  }
  return dates;
};

/** Подпись даты экскурсии в корзине и заказах: «вт, 3 нояб.». */
export const formatTourDate = (iso: string) => dateLabel.format(Date.parse(`${iso}T00:00:00Z`));
