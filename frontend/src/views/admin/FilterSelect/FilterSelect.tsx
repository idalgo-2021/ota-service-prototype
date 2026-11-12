'use client';

import { NativeSelect } from '@chakra-ui/react';
import { FilterField } from '../FilterField';
import { translateAdmin, useAdminLanguage } from '../adminLocale';
import { fieldStyle } from './FilterSelect.styles';
import { useController } from './useController';

export type FilterOption<T extends string> = {
  value: T;
  label: string;
};

type FilterSelectProps<T extends string> = {
  label: string;
  value: T;
  options: readonly FilterOption<T>[];
  onValueChange: (value: T) => void;
};

/** Выпадающий список с подписью над ним для панели фильтров таблицы. */
export const FilterSelect = <T extends string>({
  label,
  value,
  options,
  onValueChange,
}: FilterSelectProps<T>) => {
  const { handleChange } = useController(onValueChange);
  const lang = useAdminLanguage();
  const localizedLabel = translateAdmin(label, lang);

  return (
    <FilterField label={localizedLabel}>
      <NativeSelect.Root>
        <NativeSelect.Field
          aria-label={localizedLabel}
          value={value}
          {...fieldStyle}
          onChange={handleChange}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {translateAdmin(option.label, lang)}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </FilterField>
  );
};
