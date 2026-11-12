'use client';

import { chakra, Flex } from '@chakra-ui/react';
import { DateRangePicker } from '@/shared/date-range-picker';
import { FilterField } from '../FilterField';
import { FilterSelect, type FilterOption } from '../FilterSelect';
import { dateRangeStyle, filtersStyle, resetStyle } from '../table.styles';
import { translateAdmin, useAdminLanguage } from '../adminLocale';
import type { StatusFilter, TableFiltersState } from '../useTableFilters';

type TableFiltersProps<S extends string, K extends string> = {
  filters: TableFiltersState<S, K>;
  statusOptions: readonly FilterOption<StatusFilter<S>>[];
  sortOptions: readonly FilterOption<K>[];
  /** Подпись над диапазоном дат, например «Заезд» */
  datesLabel: string;
  /** Доступное имя диапазона дат, например «Даты заезда» */
  datesTitle: string;
};

/**
 * Панель фильтров над таблицей: статус, диапазон дат, сортировка и, если что-то
 * выбрано, кнопка сброса фильтров.
 */
export const TableFilters = <S extends string, K extends string>({
  filters,
  statusOptions,
  sortOptions,
  datesLabel,
  datesTitle,
}: TableFiltersProps<S, K>) => {
  const lang = useAdminLanguage();
  const t = (text: string) => translateAdmin(text, lang);
  return (
    <Flex {...filtersStyle}>
      <FilterSelect
        label={t('Статус')}
        value={filters.status}
        options={statusOptions}
        onValueChange={filters.handleStatusChange}
      />
      <FilterField label={t(datesLabel)}>
        <DateRangePicker
          {...dateRangeStyle}
          role="group"
          aria-label={t(datesTitle)}
          fromPlaceholder={lang === 'en' ? 'From' : 'С'}
          toPlaceholder={lang === 'en' ? 'To' : 'По'}
          locale={lang === 'en' ? 'en-US' : 'ru-RU'}
          value={filters.dates}
          onValueChange={filters.handleDatesChange}
        />
      </FilterField>
      <FilterSelect
        label={t('Сортировка')}
        value={filters.sort}
        options={sortOptions}
        onValueChange={filters.handleSortChange}
      />
      {filters.filtersActive && (
        <chakra.button type="button" {...resetStyle} onClick={filters.handleResetFilters}>
          {t('Сбросить фильтры')}
        </chakra.button>
      )}
    </Flex>
  );
};
