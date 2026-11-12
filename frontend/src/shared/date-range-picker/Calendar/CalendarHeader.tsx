'use client';

import { Box, chakra } from '@chakra-ui/react';
import { headerStyle, monthLabelStyle, NavButton } from './Calendar.styles';

type CalendarHeaderProps = {
  /** Название месяца и года, например «октябрь 2026 г.» */
  monthLabel: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

/** Шапка календаря: стрелка «‹» к предыдущему месяцу, название месяца и стрелка «›» к следующему. */
export const CalendarHeader = ({
  monthLabel,
  onPreviousMonth,
  onNextMonth,
}: CalendarHeaderProps) => (
  <Box {...headerStyle}>
    <NavButton
      type="button"
      aria-label="Предыдущий месяц"
      title="Предыдущий месяц"
      onClick={onPreviousMonth}
    >
      ‹
    </NavButton>
    <chakra.span {...monthLabelStyle}>{monthLabel}</chakra.span>
    <NavButton
      type="button"
      aria-label="Следующий месяц"
      title="Следующий месяц"
      onClick={onNextMonth}
    >
      ›
    </NavButton>
  </Box>
);
