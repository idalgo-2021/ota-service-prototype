import { useState } from 'react';
import type { DateRangeValue } from '@/shared/date-range-picker';

export type StatusFilter<S extends string> = S | 'all';

/**
 * Фильтры списка админки — статус, диапазон дат и сортировка — вместе со сдвигом страницы.
 * Любой фильтр меняет выборку, поэтому вместе с ним список листается заново с первой страницы.
 */
export const useTableFilters = <S extends string, K extends string>(defaultSort: K) => {
  const [status, setStatus] = useState<StatusFilter<S>>('all');
  const [dates, setDates] = useState<DateRangeValue>({});
  const [sort, setSort] = useState<K>(defaultSort);
  const [offset, setOffset] = useState(0);

  const withReset =
    <T>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setOffset(0);
    };

  const handleResetFilters = () => {
    setStatus('all');
    setDates({});
    setOffset(0);
  };

  return {
    status,
    dates,
    sort,
    offset,
    filtersActive: status !== 'all' || !!dates.from || !!dates.to,
    handleStatusChange: withReset(setStatus),
    handleDatesChange: withReset(setDates),
    handleSortChange: withReset(setSort),
    handleResetFilters,
    handleOffsetChange: setOffset,
  };
};

export type TableFiltersState<S extends string, K extends string> = ReturnType<
  typeof useTableFilters<S, K>
>;
