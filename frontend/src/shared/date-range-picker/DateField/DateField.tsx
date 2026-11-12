'use client';

import { Box } from '@chakra-ui/react';
import { Calendar } from '../Calendar';
import { getFieldContainerStyle, popoverPanelStyle } from './DateField.styles';
import { LabeledTrigger } from './LabeledTrigger';
import { PlainTrigger } from './PlainTrigger';
import { useController } from './useController';

export type DateFieldProps = {
  value?: string;
  anchorDate?: string;
  anchorLabel?: string;
  id?: string;
  placeholder?: string;
  label?: string;
  min?: string;
  max?: string;
  locale: string;
  divided?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value?: string) => void;
};

/**
 * Одно поле выбора даты с выпадающим календарём. Если передан `label`, рисуется поле
 * с подписью сверху, иначе — компактное поле в рамке.
 * По клику под полем открывается календарь; клик снаружи или Escape его закрывают.
 */
export const DateField = ({
  value,
  anchorDate,
  anchorLabel,
  id,
  placeholder,
  label,
  min,
  max,
  locale,
  divided,
  open,
  onOpenChange,
  onChange,
}: DateFieldProps) => {
  const {
    handleToggleOpen,
    containerRef,
    displayValue,
    handleSelect,
    handleTriggerKeyDown,
  } = useController({ value, locale, open, onOpenChange, onChange });

  const triggerProps = {
    id,
    displayValue,
    placeholder,
    onToggleOpen: handleToggleOpen,
    onKeyDown: handleTriggerKeyDown,
  };

  return (
    <Box ref={containerRef} {...getFieldContainerStyle(divided)}>
      {label ? (
        <LabeledTrigger label={label} {...triggerProps} />
      ) : (
        <PlainTrigger {...triggerProps} />
      )}
      {open && (
        <Box {...popoverPanelStyle}>
          <Calendar
            value={value}
            anchorDate={anchorDate}
            anchorLabel={anchorLabel}
            min={min}
            max={max}
            locale={locale}
            onSelect={handleSelect}
          />
        </Box>
      )}
    </Box>
  );
};
