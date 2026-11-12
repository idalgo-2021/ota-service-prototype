import type { Money, UnitType } from './api';

const pluralRules = new Intl.PluralRules('ru-RU');

/**
 * Слово в нужной форме для числа: `pluralize(5, ['ночь', 'ночи', 'ночей'])` → «ночей».
 * Формы — для 1, для 2–4 и для 5 и больше.
 */
export const pluralize = (count: number, [one, few, many]: [string, string, string]) => {
  const rule = pluralRules.select(count);
  if (rule === 'one') {
    return one;
  }
  return rule === 'few' ? few : many;
};

/** Число со словом в нужной форме: «3 ночи». */
export const formatCount = (count: number, forms: [string, string, string]) =>
  `${count} ${pluralize(count, forms)}`;

/** Сумма в валюте; копейки показываем, только если они есть: «5 500 ₽», «12,50 $». */
export const formatMoney = (amount: Money | number, currency: string, locale = 'ru-RU') => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    // Неизвестный Intl код валюты — показываем как есть.
    return `${amount} ${currency}`;
  }
};

/** Базовая цена без дат относится к одному объекту, номеру или месту. */
export const formatStartingPrice = (
  amount: Money | number,
  currency: string,
  unitType: UnitType
) => {
  const unit =
    unitType === 'bed' ? 'за место / ночь' : unitType === 'room' ? 'за номер / ночь' : 'за ночь';
  return `от ${formatMoney(amount, currency)} ${unit}`;
};
