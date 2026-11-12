import { useState } from 'react';
import {
  getMonthGrid,
  getWeekdayLabels,
  isoToDate,
  dateToIso,
  isSameDay,
  getMonthLabel,
} from '../utils';

type UseControllerParams = {
  /** Дата в формате YYYY-MM-DD */
  value?: string;
  anchorDate?: string;
  /** Дата в формате YYYY-MM-DD */
  min?: string;
  /** Дата в формате YYYY-MM-DD */
  max?: string;
  locale: string;
  onSelect: (iso: string) => void;
};

export const useController = ({
  value,
  anchorDate,
  min,
  max,
  locale,
  onSelect,
}: UseControllerParams) => {
  const selected = value ? isoToDate(value) : undefined;
  const anchor = anchorDate ? isoToDate(anchorDate) : undefined;
  const minDate = min ? isoToDate(min) : undefined;
  const maxDate = max ? isoToDate(max) : undefined;
  const today = new Date(
    Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  );

  // При выборе выезда открываем месяц заезда, чтобы исходная дата оставалась видна.
  const initial = anchor ?? selected ?? (minDate && minDate > today ? minDate : today);
  const [year, setYear] = useState(initial.getUTCFullYear());
  const [month, setMonth] = useState(initial.getUTCMonth());

  const goToMonth = (delta: number) => {
    const next = new Date(Date.UTC(year, month + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
  };

  const weekdays = getWeekdayLabels(locale);
  const days = getMonthGrid(year, month).map((day) => {
    const handleSelect = () => {
      onSelect(dateToIso(day));
    };
    return {
      id: day.toISOString(),
      label: day.getUTCDate(),
      handleSelect,
      disabled: (!!minDate && day < minDate) || (!!maxDate && day > maxDate),
      state: {
        outsideMonth: day.getUTCMonth() !== month,
        isSelected: !!selected && isSameDay(day, selected),
        isAnchor: !!anchor && isSameDay(day, anchor),
        isToday: isSameDay(day, today),
      },
    };
  });
  const handlePreviousMonth = () => {
    goToMonth(-1);
  };
  const handleNextMonth = () => {
    goToMonth(1);
  };
  const monthLabel = getMonthLabel(year, month, locale);

  return { monthLabel, handlePreviousMonth, handleNextMonth, weekdays, days };
};
