const getDateTimeFormat = (lang: 'ru' | 'en') =>
  new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatDateTime = (value: string, lang: 'ru' | 'en' = 'ru') =>
  getDateTimeFormat(lang).format(new Date(value));

/**
 * Короткий вид UUID для таблиц, полный показываем в подсказке. Берём хвост, а не начало:
 * у фиксированных id из сидов различается только конец.
 */
export const shortId = (id: string) => id.slice(-8);
