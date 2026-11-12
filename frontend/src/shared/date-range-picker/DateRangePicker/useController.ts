import { useState } from 'react';
import { addDaysIso, getTodayIso, normalizeBookingDateRange } from '../utils';
import type { DateRangeValue } from './DateRangePicker';

type UseControllerParams = {
  value?: DateRangeValue;
  defaultValue?: DateRangeValue;
  onValueChange?: (value: DateRangeValue) => void;
  fromLabel?: string;
  toLabel?: string;
  forBooking: boolean;
};

export const useController = ({
  value,
  defaultValue,
  onValueChange,
  fromLabel,
  toLabel,
  forBooking,
}: UseControllerParams) => {
  const [innerValue, setInnerValue] = useState<DateRangeValue>(defaultValue ?? {});
  const current = value ?? innerValue;
  const labeled = !!(fromLabel || toLabel);

  // Только одно окошко выбора даты может быть открыто одновременно
  const [openField, setOpenField] = useState<'from' | 'to' | null>(null);
  const handleOpenChange = (field: 'from' | 'to') => (open: boolean) => {
    setOpenField((prev) => {
      if (open) {
        return field;
      }
      return prev === field ? null : prev;
    });
  };

  const update = (patch: DateRangeValue) => {
    const next = { ...current, ...patch };
    setInnerValue(next);
    onValueChange?.(next);
  };

  const handleFromChange = (from?: string) => {
    if (!forBooking) {
      update({ from });
      return;
    }

    // Если новый заезд догнал прежний выезд, сохраняем допустимую поездку длиной в одну ночь.
    update(normalizeBookingDateRange({ from, to: current.to }));
  };
  const handleToChange = (to?: string) => {
    if (!forBooking) {
      update({ to });
      return;
    }
    update(normalizeBookingDateRange({ from: current.from, to }));
  };
  // Даты `YYYY-MM-DD` сравниваются как строки. Для поездки — не раньше сегодня и хотя бы
  // одна ночь; для обычного диапазона «с» не позже «по», и наоборот.
  const today = getTodayIso();
  const fromMin = forBooking ? today : undefined;
  const fromMax = forBooking ? undefined : current.to;
  const toMin = forBooking ? addDaysIso(current.from ?? today, 1) : current.from;

  const handleFromOpenChange = handleOpenChange('from');
  const handleToOpenChange = handleOpenChange('to');
  return {
    current,
    labeled,
    openField,
    handleFromOpenChange,
    handleToOpenChange,
    handleFromChange,
    handleToChange,
    fromMin,
    fromMax,
    toMin,
  };
};
