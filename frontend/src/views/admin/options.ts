import type { AdminTableStatus } from './AdminTable';
import type { FilterOption } from './FilterSelect';
import type { StatusFilter } from './useTableFilters';

/** Варианты выпадающего списка из словаря «значение → описание с подписью». */
export const toOptions = <T extends string>(record: Record<T, { label: string }>) =>
  (Object.keys(record) as T[]).map((value): FilterOption<T> => ({
    value,
    label: record[value].label,
  }));

/** Варианты фильтра по статусу: «Все» и затем каждый статус. */
export const toStatusOptions = <S extends string>(statuses: Record<S, { label: string }>) => [
  { value: 'all', label: 'Все' } as FilterOption<StatusFilter<S>>,
  ...toOptions(statuses),
];

/** Что показать в таблице по состоянию запроса списка и числу строк. */
export const getTableStatus = (
  { isError, data }: { isError: boolean; data?: unknown },
  rowCount: number
): AdminTableStatus => {
  if (isError) {
    return 'error';
  }
  if (!data) {
    return 'loading';
  }
  return rowCount ? 'ready' : 'empty';
};
