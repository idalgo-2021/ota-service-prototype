export type ReviewTopic =
  | 'interior'
  | 'location'
  | 'cleanliness'
  | 'view'
  | 'service'
  | 'breakfast'
  | 'noise';

export type ReviewHighlight = {
  topic: ReviewTopic;
  label: string;
  tone: 'positive' | 'negative';
};

export type ListingReviews = {
  rating: number;
  count: number;
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

const hash = (text: string) =>
  [...text].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);

export const getDemoReviews = ({
  id,
  title,
}: {
  id: string;
  title: string;
}): ListingReviews => {
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

const ratingFormat = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const formatRating = (rating: number) => ratingFormat.format(rating);

const pluralRules = new Intl.PluralRules('ru-RU');

export const pluralize = (count: number, [one, few, many]: [string, string, string]) => {
  const rule = pluralRules.select(count);
  if (rule === 'one') {
    return one;
  }
  return rule === 'few' ? few : many;
};

export const formatCount = (count: number, forms: [string, string, string]) =>
  `${count} ${pluralize(count, forms)}`;

export const getPraise = ({ highlights }: ListingReviews) =>
  highlights
    .filter((highlight) => highlight.tone === 'positive')
    .slice(0, 3)
    .map((highlight) => PRAISE_WORDS[highlight.topic])
    .join(', ');

