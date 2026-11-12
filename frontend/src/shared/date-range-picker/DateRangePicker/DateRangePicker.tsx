'use client';

import { Stack, type StackProps } from '@chakra-ui/react';
import { forwardRef } from 'react';
import { DateField } from '../DateField';
import { getRootStyle } from './DateRangePicker.styles';
import { useController } from './useController';

export type DateRangeValue = {
  /** Дата в формате YYYY-MM-DD */
  from?: string;
  /** Дата в формате YYYY-MM-DD */
  to?: string;
};

export type DateRangePickerProps = Omit<StackProps, 'value' | 'defaultValue' | 'onChange'> & {
  value?: DateRangeValue;
  defaultValue?: DateRangeValue;
  onValueChange?: (value: DateRangeValue) => void;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  /** Заголовок внутри поля "от". Вместе с toLabel включает вид через дефис */
  fromLabel?: string;
  /** Заголовок внутри поля "до" */
  toLabel?: string;
  locale?: string;
  /**
   * Даты поездки: обе не раньше сегодняшнего дня, выезд строго позже заезда. Если новый заезд
   * догоняет выбранный выезд, выезд переносится на следующий день. Без флага — обычный диапазон
   * «с … по», где обе даты могут совпадать и уходить в прошлое (например, фильтр в админке).
   */
  forBooking?: boolean;
};

/**
 * Два поля дат «от — до» в одну строку, каждое со своим календарём.
 * С `fromLabel`/`toLabel` поля склеены в одну белую плашку с разделителем, как на главной;
 * без подписей — два отдельных компактных поля в рамке.
 */
export const DateRangePicker = forwardRef<HTMLDivElement, DateRangePickerProps>(
  function DateRangePicker(
    {
      value,
      id,
      defaultValue,
      onValueChange,
      fromPlaceholder = 'From',
      toPlaceholder = 'To',
      fromLabel,
      toLabel,
      locale = 'ru-RU',
      forBooking = false,
      ...props
    },
    ref
  ) {
    const {
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
    } = useController({
      value,
      defaultValue,
      onValueChange,
      fromLabel,
      toLabel,
      forBooking,
    });

    return (
      <Stack ref={ref} {...getRootStyle(labeled)} {...props}>
        <DateField
          value={current.from}
          placeholder={fromPlaceholder}
          label={fromLabel}
          min={fromMin}
          max={fromMax}
          locale={locale}
          open={openField === 'from'}
          onOpenChange={handleFromOpenChange}
          onChange={handleFromChange}
        />
        <DateField
          id={id}
          value={current.to}
          anchorDate={forBooking ? current.from : undefined}
          anchorLabel={forBooking ? (fromLabel ?? 'Заезд') : undefined}
          placeholder={toPlaceholder}
          label={toLabel}
          min={toMin}
          locale={locale}
          divided={labeled}
          open={openField === 'to'}
          onOpenChange={handleToOpenChange}
          onChange={handleToChange}
        />
      </Stack>
    );
  }
);
