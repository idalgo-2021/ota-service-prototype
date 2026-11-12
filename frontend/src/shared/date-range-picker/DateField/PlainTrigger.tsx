'use client';

import { Box, chakra } from '@chakra-ui/react';
import { CalendarIcon } from '../../icons';
import {
  getPlainTriggerStyle,
  getValueTextStyle,
  plainCalendarIconStyle,
  plainIndicatorGroupStyle,
} from './DateField.styles';
import type { DateFieldTriggerProps } from './types';

/**
 * Компактное поле даты в рамке без подписи: дата или плейсхолдер слева,
 * справа иконка календаря.
 */
export const PlainTrigger = ({
  id,
  displayValue,
  placeholder,
  onToggleOpen,
  onKeyDown,
}: DateFieldTriggerProps) => (
  <Box
    id={id}
    role="button"
    tabIndex={0}
    {...getPlainTriggerStyle()}
    onClick={onToggleOpen}
    onKeyDown={onKeyDown}
  >
    <chakra.span {...getValueTextStyle('16px', !!displayValue)}>
      {displayValue ?? placeholder}
    </chakra.span>
    <Box {...plainIndicatorGroupStyle}>
      <Box {...plainCalendarIconStyle}>
        <CalendarIcon />
      </Box>
    </Box>
  </Box>
);
