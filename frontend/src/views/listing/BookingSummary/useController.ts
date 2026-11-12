import type { Guests } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { formatGuestsForPrice, formatNights } from '@/lib/stay';

type TotalLine = {
  label: string;
  /** Сумма словами; пока сервер пересчитывает услуги — отсутствует */
  value?: string;
  /** Итоговая строка — жирная */
  strong?: boolean;
};

/** Итог проживания. Продукты и услуги оформляются независимо в корзине. */
export const useController = (
  nights: number | undefined,
  stayTotal: number,
  stayCurrency: string | undefined,
  hasUnits: boolean,
  guests: Guests,
  fits: boolean
) => {
  const guestScope = fits ? ` · ${formatGuestsForPrice(guests)}` : '';
  const stayLine =
    hasUnits && nights && stayCurrency
      ? {
          label: `Проживание, ${formatNights(nights)}${guestScope}`,
          value: formatMoney(stayTotal, stayCurrency),
        }
      : undefined;
  const getLines = (): TotalLine[] => {
    return stayLine && nights
      ? [
          {
            label: `Итого за ${formatNights(nights)}${guestScope}`,
            value: stayLine.value,
            strong: true,
          },
        ]
      : [];
  };

  return { totalLines: getLines() };
};
