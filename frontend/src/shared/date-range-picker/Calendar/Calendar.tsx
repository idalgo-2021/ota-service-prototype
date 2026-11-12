'use client';

import { Box, Grid, chakra } from '@chakra-ui/react';
import { formatIsoDate } from '../utils';
import {
  anchorInfoStyle,
  containerStyle,
  dayGridStyle,
  DayButton,
  getDayButtonStyle,
  weekdayGridStyle,
  weekdayLabelStyle,
} from './Calendar.styles';
import { CalendarHeader } from './CalendarHeader';
import { useController } from './useController';

export type CalendarProps = {
  /** Дата в формате YYYY-MM-DD */
  value?: string;
  /** Дата, которую нужно показывать как ориентир при выборе другой даты. */
  anchorDate?: string;
  anchorLabel?: string;
  /** Дата в формате YYYY-MM-DD */
  min?: string;
  /** Дата в формате YYYY-MM-DD */
  max?: string;
  locale: string;
  onSelect: (iso: string) => void;
};

/**
 * Календарь на один месяц: шапка с переключением месяцев,
 * строка дней недели и сетка дней 7×N с соседними днями по краям. Выбранный день залит,
 * сегодняшний отмечен, дни вне диапазона `min`–`max` недоступны.
 */
export const Calendar = ({
  value,
  anchorDate,
  anchorLabel,
  min,
  max,
  locale,
  onSelect,
}: CalendarProps) => {
  const { monthLabel, handlePreviousMonth, handleNextMonth, weekdays, days } = useController({
    value,
    anchorDate,
    min,
    max,
    locale,
    onSelect,
  });

  return (
    <Box {...containerStyle}>
      <CalendarHeader
        monthLabel={monthLabel}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
      />

      {anchorDate && anchorLabel && (
        <chakra.p {...anchorInfoStyle}>
          {anchorLabel}: {formatIsoDate(anchorDate, { locale })}
        </chakra.p>
      )}

      <Grid {...weekdayGridStyle}>
        {weekdays.map((day) => (
          <chakra.span key={day} {...weekdayLabelStyle}>
            {day}
          </chakra.span>
        ))}
      </Grid>

      <Grid {...dayGridStyle}>
        {days.map((day) => (
          <DayButton
            key={day.id}
            type="button"
            disabled={day.disabled}
            onClick={day.handleSelect}
            css={getDayButtonStyle(day.state)}
          >
            {day.label}
          </DayButton>
        ))}
      </Grid>
    </Box>
  );
};
