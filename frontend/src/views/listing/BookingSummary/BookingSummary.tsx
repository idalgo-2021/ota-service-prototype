'use client';

import { Flex, Stack, Text } from '@chakra-ui/react';
import type { ListingUnit } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { formatGuests, formatNights, type Stay } from '@/lib/stay';
import { Button } from '@/shared/button';
import { Card } from '@/shared/card';
import { formatIsoDate } from '@/shared/date-range-picker';
import { formatShortage } from '../units';
import {
  bookButtonStyle,
  cardStyle,
  getTotalStyle,
  errorStyle,
  hintStyle,
  lineStyle,
  mutedStyle,
  titleStyle,
  unitLineStyle,
} from './BookingSummary.styles';
import { useController } from './useController';

type BookingSummaryProps = {
  stay: Stay;
  nights?: number;
  selectedUnits: ListingUnit[];
  shortage: { adults: number; children: number };
  fits: boolean;
  total: number;
  currency?: string;
  isSignedIn: boolean;
  authRestored: boolean;
  pending: boolean;
  error?: string;
  onBook: () => void;
};

/**
 * Сводка проживания сбоку от номеров: даты, гости, выбранные номера с ценой и итог.
 * Подсказка говорит, чего не хватает: дат, номера, мест для всех гостей
 * или входа в аккаунт.
 */
export const BookingSummary = ({
  stay,
  nights,
  selectedUnits,
  shortage,
  fits,
  total,
  currency,
  isSignedIn,
  authRestored,
  pending,
  error,
  onBook,
}: BookingSummaryProps) => {
  const { totalLines } = useController(
    nights,
    total,
    currency,
    selectedUnits.length > 0,
    stay.guests,
    fits
  );

  const getHint = () => {
    if (!nights) {
      return 'Выберите даты заезда и выезда, чтобы увидеть доступные варианты.';
    }
    if (!selectedUnits.length) {
      return 'Выберите вариант — можно несколько, если все не помещаются в один.';
    }
    if (!fits) {
      return `Не хватает мест: выберите еще вариант на ${formatShortage(shortage)}.`;
    }
    if (authRestored && !isSignedIn) {
      return 'Чтобы забронировать, войдите через кнопку «Войти» вверху страницы.';
    }
    return undefined;
  };
  const hint = getHint();

  return (
    <Card {...cardStyle}>
      <Stack {...lineStyle}>
        <Text {...titleStyle}>Ваша поездка</Text>
        {stay.checkin && stay.checkout && nights ? (
          <Text>
            {formatIsoDate(stay.checkin)} — {formatIsoDate(stay.checkout)}, {formatNights(nights)}
          </Text>
        ) : (
          <Text {...mutedStyle}>Даты не выбраны</Text>
        )}
        <Text>{formatGuests(stay.guests)}</Text>
      </Stack>

      {selectedUnits.length > 0 && nights && currency && (
        <Stack {...lineStyle}>
          {selectedUnits.map((unit) => (
            <Flex key={unit.id} {...unitLineStyle}>
              <Text>{unit.parent_name ? `${unit.parent_name} · ${unit.name}` : unit.name}</Text>
              <Text {...mutedStyle}>{formatMoney(unit.price_per_night, unit.currency)} / ночь</Text>
            </Flex>
          ))}
        </Stack>
      )}

      {totalLines.length > 0 && (
        <Stack {...lineStyle}>
          {totalLines.map((line) => (
            <Flex key={line.label} {...unitLineStyle}>
              <Text {...getTotalStyle(!!line.strong)}>{line.label}</Text>
              {line.value ? (
                <Text {...getTotalStyle(!!line.strong)}>{line.value}</Text>
              ) : (
                <Text {...mutedStyle}>Считаем…</Text>
              )}
            </Flex>
          ))}
        </Stack>
      )}

      {hint && <Text {...hintStyle}>{hint}</Text>}
      {error && <Text {...errorStyle}>{error}</Text>}
      <Button
        {...bookButtonStyle}
        disabled={!fits || !isSignedIn}
        loading={pending}
        onClick={onBook}
      >
        Забронировать
      </Button>
    </Card>
  );
};
