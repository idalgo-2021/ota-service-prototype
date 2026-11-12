'use client';

import { Box, chakra } from '@chakra-ui/react';
import { InputLabel } from '../../input-label';
import { getLabeledTriggerStyle, getValueTextStyle } from './DateField.styles';
import type { DateFieldTriggerProps } from './types';

/**
 * Поле даты с подписью сверху, как на главной: мелкий заголовок («Заезд»), под ним дата
 * или плейсхолдер. Без собственной рамки — её рисует обёртка DateRangePicker.
 */
export const LabeledTrigger = ({
  id,
  label,
  displayValue,
  placeholder,
  onToggleOpen,
  onKeyDown,
}: DateFieldTriggerProps & { label: string }) => (
  <Box
    id={id}
    role="button"
    tabIndex={0}
    {...getLabeledTriggerStyle()}
    onClick={onToggleOpen}
    onKeyDown={onKeyDown}
  >
    <InputLabel label={label} />
    <chakra.span {...getValueTextStyle('14px', !!displayValue)}>
      {displayValue ?? placeholder}
    </chakra.span>
  </Box>
);
