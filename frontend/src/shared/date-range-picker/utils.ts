const dateFormatOptions: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
};

export const formatIsoDate = (iso: string, { locale = 'ru-RU', withYear = true } = {}) =>
  new Intl.DateTimeFormat(locale, {
    ...dateFormatOptions,
    year: withYear ? 'numeric' : undefined,
  }).format(isoToDate(iso));

export const isoToDate = (iso: string): Date => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export const dateToIso = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Дата `YYYY-MM-DD` на `days` дней позже (или раньше, если `days` отрицательный). */
export const addDaysIso = (iso: string, days: number): string => {
  const date = isoToDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToIso(date);
};

/** Сегодняшняя дата `YYYY-MM-DD` по часам пользователя. */
export const getTodayIso = (): string => {
  const now = new Date();
  return dateToIso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
};

/** Проверяет календарную дату в строгом формате YYYY-MM-DD. */
export const isIsoDate = (value?: string): value is string =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateToIso(isoToDate(value)) === value;

export type BookingDateRange = {
  from?: string;
  to?: string;
};

/**
 * Возвращает допустимые даты поездки: заезд не раньше сегодня, выезд минимум через сутки.
 * Корректный будущий диапазон сохраняется без изменений.
 */
export const normalizeBookingDateRange = (
  value: BookingDateRange,
  today = getTodayIso()
): Required<BookingDateRange> => {
  const from = isIsoDate(value.from) && value.from >= today ? value.from : today;
  const earliestTo = addDaysIso(from, 1);
  const to = isIsoDate(value.to) && value.to >= earliestTo ? value.to : earliestTo;
  return { from, to };
};

/** Строгая проверка диапазона перед отправкой формы поиска. */
export const isValidBookingDateRange = (
  value: BookingDateRange,
  today = getTodayIso()
): value is Required<BookingDateRange> =>
  isIsoDate(value.from) &&
  value.from >= today &&
  isIsoDate(value.to) &&
  value.to >= addDaysIso(value.from, 1);

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

/** Название месяца и года для заголовка календаря, например "октябрь 2026 г." */
export const getMonthLabel = (year: number, month: number, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month, 1)));

/** Короткие названия дней недели, понедельник первым */
export const getWeekdayLabels = (locale: string): string[] => {
  // 1 января 2024 — понедельник, удобная опорная неделя
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(Date.UTC(2024, 0, 1 + i));
    return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
      .format(day)
      .replace('.', '');
  });
};

/** 42 даты (6 недель по 7 дней) для сетки месяца, понедельник первым столбцом */
export const getMonthGrid = (year: number, month: number): Date[] => {
  const first = new Date(Date.UTC(year, month, 1));
  const firstWeekday = (first.getUTCDay() + 6) % 7; // 0 = понедельник
  const start = new Date(Date.UTC(year, month, 1 - firstWeekday));
  return Array.from(
    { length: 42 },
    (_, i) =>
      new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i))
  );
};
