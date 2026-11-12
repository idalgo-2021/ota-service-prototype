'use client';

import { chakra, NativeSelect } from '@chakra-ui/react';
import { colors } from '../colors';
import { SortIcon } from '../icons';
import { fieldStyle, iconStyle, rootStyle } from './SortSelect.styles';

export type SortDirection = 'asc' | 'desc';

const OPTIONS = {
  price: {
    label: 'По цене',
    ariaLabel: 'Сортировка по цене',
    options: [
      { value: 'asc', label: 'Сначала дешевле' },
      { value: 'desc', label: 'Сначала дороже' },
    ],
  },
  rating: {
    label: 'По рейтингу',
    ariaLabel: 'Сортировка по рейтингу',
    options: [
      { value: 'desc', label: 'Сначала высокий рейтинг' },
      { value: 'asc', label: 'Сначала низкий рейтинг' },
    ],
  },
} as const;

type SortSelectProps = {
  /** По чему сортировать: подпись и варианты берутся отсюда. */
  by: keyof typeof OPTIONS;
  /** `undefined` — сортировка по этому полю не выбрана. */
  value?: SortDirection;
  onChange: (value: SortDirection | undefined) => void;
};

/** Компактный выбор сортировки с иконкой: «По цене» или «По рейтингу» и направление. */
export const SortSelect = ({ by, value, onChange }: SortSelectProps) => {
  const { label, ariaLabel, options } = OPTIONS[by];

  return (
    <NativeSelect.Root {...rootStyle}>
      <chakra.span {...iconStyle}>
        <SortIcon size={18} />
      </chakra.span>
      <NativeSelect.Field
        aria-label={ariaLabel}
        value={value ?? ''}
        {...fieldStyle}
        onChange={(event) => onChange((event.target.value as SortDirection) || undefined)}
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator color={colors.primary} />
    </NativeSelect.Root>
  );
};
