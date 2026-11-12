/**
 * Дата в формате YYYY-MM-DD
 */
export const dateToIso = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Сегодняшняя календарная дата по локальному времени пользователя.
 */
export const getTodayIso = (): string => {
  return dateToIso(new Date());
};

/**
 * Добавляет указанное количество дней к ISO-дате YYYY-MM-DD.
 */
export const addDaysIso = (iso: string, days: number): string => {
  if (!iso) return iso;
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return dateToIso(date);
};

/**
 * Проверка валидности формата YYYY-MM-DD.
 */
export const isIsoDate = (value?: string): value is string =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));

/**
 * Нормализует диапазон дат для поездки (по правилам фронтенда):
 * - Дата заезда не может быть меньше текущей.
 * - Дата заезда не может быть больше или равна дате выезда (минимум 1 ночь).
 */
export const normalizeBookingDateRange = (
  from?: string,
  to?: string,
  today = getTodayIso()
): { checkin: string; checkout: string } => {
  const checkin = isIsoDate(from) && from >= today ? from : today;
  const earliestCheckout = addDaysIso(checkin, 1);
  const checkout = isIsoDate(to) && to >= earliestCheckout ? to : earliestCheckout;
  return { checkin, checkout };
};

/**
 * Форматирование даты в русском формате с годом: "6 нояб. 2026 г."
 */
export const formatRuDate = (iso: string, withYear = true): string => {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: withYear ? 'numeric' : undefined,
  }).format(date);
};

/**
 * Короткое форматирование даты в русском формате без года: "6 нояб."
 */
export const formatRuShort = (iso: string): string => formatRuDate(iso, false);

/**
 * Преобразует ISO дату YYYY-MM-DD в цифровой формат RU: ДД.ММ.ГГГГ (например, 06.11.2026).
 */
export const isoToRuDigits = (iso: string): string => {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
};

/**
 * Парсит строку в формате ДД.ММ.ГГГГ (или с / или -) в валидный ISO YYYY-MM-DD.
 */
export const ruDigitsToIso = (ru: string): string | null => {
  if (!ru) return null;
  const match = ru.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Маска для ввода даты в формате ДД.ММ.ГГГГ с поддержкой удаления символов.
 */
export const maskRuInput = (next: string, prev?: string): string => {
  if (prev && prev.endsWith('.') && next === prev.slice(0, -1)) {
    next = next.slice(0, -1);
  }
  const digits = next.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
};
