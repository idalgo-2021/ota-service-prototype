import type { Listing } from './api';

/**
 * Тема, которую гости отмечают в отзывах: интерьер, расположение, чистота, вид, сервис,
 * завтрак, шум.
 */
export type ReviewTopic =
  'interior' | 'location' | 'cleanliness' | 'view' | 'service' | 'breakfast' | 'noise';

export type ReviewHighlight = {
  topic: ReviewTopic;
  label: string;
  /** Хвалят или жалуются */
  tone: 'positive' | 'negative';
};

/** Сводка отзывов об объекте: оценка, сколько отзывов, пересказ от ИИ и главные темы. */
export type ListingReviews = {
  /** Средняя оценка от 1 до 10 */
  rating: number;
  count: number;
  /** Объект проверен сервисом */
  verified: boolean;
  summary: string;
  highlights: ReviewHighlight[];
};

const POSITIVE: Record<Exclude<ReviewTopic, 'noise'>, ReviewHighlight> = {
  interior: { topic: 'interior', label: 'Стильный интерьер', tone: 'positive' },
  location: { topic: 'location', label: 'Отличное расположение', tone: 'positive' },
  cleanliness: { topic: 'cleanliness', label: 'Чисто и уютно', tone: 'positive' },
  view: { topic: 'view', label: 'Красивый вид из окон', tone: 'positive' },
  service: { topic: 'service', label: 'Внимательный персонал', tone: 'positive' },
  breakfast: { topic: 'breakfast', label: 'Вкусный завтрак', tone: 'positive' },
};

const NOISE: ReviewHighlight = { topic: 'noise', label: 'Иногда бывает шумно', tone: 'negative' };

// Что хвалят — одним словом для строки «Гости хвалят: вид, интерьер, расположение».
const PRAISE_WORDS: Record<ReviewTopic, string> = {
  interior: 'интерьер',
  location: 'расположение',
  cleanliness: 'чистоту',
  view: 'вид',
  service: 'сервис',
  breakfast: 'завтрак',
  noise: 'тишину',
};

const SUMMARY_PHRASES: Record<ReviewTopic, string> = {
  interior: 'стильный интерьер',
  location: 'удобное расположение',
  cleanliness: 'чистоту',
  view: 'прекрасный вид из окон',
  service: 'внимательный персонал',
  breakfast: 'вкусный завтрак',
  noise: 'тишину',
};

const makeReviews = (
  rating: number,
  count: number,
  topics: Exclude<ReviewTopic, 'noise'>[],
  noisy: boolean
): ListingReviews => {
  const phrases = topics.map((topic) => SUMMARY_PHRASES[topic]);
  const praised = `${phrases.slice(0, -1).join(', ')} и ${phrases[phrases.length - 1]}`;
  return {
    rating,
    count,
    verified: true,
    summary:
      `Гости особенно отмечают ${praised}. ` +
      (noisy
        ? 'Встречаются редкие замечания по шумоизоляции, в остальном впечатления очень положительные.'
        : 'Серьезных замечаний почти нет, большинство гостей хотели бы вернуться.'),
    highlights: [...topics.map((topic) => POSITIVE[topic]), ...(noisy ? [NOISE] : [])],
  };
};

// Объекты из макета — с теми же цифрами, что на макете. Ключ — название: id в сиде случайные.
const KNOWN: Record<string, ListingReviews> = {
  'Лофт на Красном Октябре': makeReviews(
    9.6,
    124,
    ['view', 'interior', 'location', 'cleanliness'],
    true
  ),
  'Гранд Отель "Центральный"': makeReviews(9.2, 318, ['service', 'location', 'breakfast'], false),
};

const TOPIC_POOL: Exclude<ReviewTopic, 'noise'>[] = [
  'view',
  'interior',
  'location',
  'cleanliness',
  'service',
  'breakfast',
];

// Простой хеш строки: одинаковый id всегда дает одинаковые демо-отзывы.
const hash = (text: string) =>
  [...text].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);

/**
 * ДЕМО-ДАННЫЕ интерфейса. Этот виджет пока не запрашивает реальные отзывы с бэкенда.
 * Объекты из макета получают заданные цифры, остальные — значения, вычисленные из id.
 * После подключения API заменить этот источник данных на ответ сервера.
 */
export const getDemoReviews = ({ id, title }: Pick<Listing, 'id' | 'title'>): ListingReviews => {
  const known = KNOWN[title];
  if (known) {
    return known;
  }
  const seed = hash(id);
  const rating = 8 + (seed % 10) / 5;
  const count = 20 + (seed % 380);
  const start = seed % TOPIC_POOL.length;
  const topics = [0, 1, 2].map((offset) => TOPIC_POOL[(start + offset) % TOPIC_POOL.length]);
  return makeReviews(rating, count, topics, seed % 3 === 0);
};

/** Что хвалят гости — три первые темы словами: «вид, интерьер, расположение». */
export const getPraise = ({ highlights }: ListingReviews) =>
  highlights
    .filter((highlight) => highlight.tone === 'positive')
    .slice(0, 3)
    .map((highlight) => PRAISE_WORDS[highlight.topic])
    .join(', ');

const ratingFormat = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Оценка с одним знаком после запятой: «4,8». */
export const formatRating = (rating: number) => ratingFormat.format(rating);
