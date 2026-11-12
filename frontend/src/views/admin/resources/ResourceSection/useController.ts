import { useState } from 'react';
import {
  useGetAdminPageQuery,
  useUpdateAdminRecordMutation,
  type AdminRecord,
} from '@/lib/adminApi';
import { getErrorMessage } from '@/lib/api';
import { getTableStatus } from '../../options';
import { usePageSize } from '../../usePageSize';
import type { RowAction } from '../../RowActions';
import type { RecordDialogTarget } from '../RecordDialog/useController';
import type { ResourceAction, ResourceConfig } from '../types';

type ReasonTarget = { action: ResourceAction; record: AdminRecord };

export const useController = (config: ResourceConfig) => {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filtersVersion, setFiltersVersion] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dialog, setDialog] = useState<RecordDialogTarget>();
  const [details, setDetails] = useState<AdminRecord>();
  const [reasonTarget, setReasonTarget] = useState<ReasonTarget>();
  const [act, actState] = useUpdateAdminRecordMutation();
  const { pageSize, changePageSize } = usePageSize();

  const list = useGetAdminPageQuery({
    path: config.path,
    params: {
      ...config.params,
      ...filters,
      ...(config.unpaginated ? {} : { limit: pageSize, offset }),
    },
  });

  const getRecordPath = (record: AdminRecord) =>
    config.recordPath?.(record) ?? `${config.path}/${encodeURIComponent(config.getId(record))}`;

  // Любой фильтр меняет выборку, поэтому список листается заново с первой страницы.
  const handleFilterChange = (name: string) => (value: string) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setOffset(0);
  };

  const handleResetFilters = () => {
    setFilters({});
    setFiltersVersion((current) => current + 1);
    setOffset(0);
  };

  const runAction = async (action: ResourceAction, record: AdminRecord, reason?: string) => {
    const result = await act({ path: action.path(record), body: reason ? { reason } : {} });
    if (!result.error) {
      setReasonTarget(undefined);
    }
  };

  const getActions = (record: AdminRecord): RowAction[] => [
    ...(config.details ? [{ label: config.details.label, onClick: () => setDetails(record) }] : []),
    ...(config.canEdit && config.fields
      ? [
          {
            label: config.editActionLabel ?? 'Изменить',
            onClick: () => setDialog({ mode: 'edit', record }),
          },
        ]
      : []),
    ...(config.actions ?? [])
      .filter((action) => action.visible?.(record) ?? true)
      .map((action) => ({
        label: action.label,
        danger: action.danger,
        onClick: () => {
          actState.reset();
          if (action.reason) {
            setReasonTarget({ action, record });
          } else {
            runAction(action, record);
          }
        },
      })),
  ];

  const busyPath = actState.isLoading ? actState.originalArgs?.path : undefined;
  const allRecords = list.data?.items ?? [];
  const visibleRecords = config.unpaginated
    ? allRecords.slice(offset, offset + pageSize)
    : allRecords;
  const rows = visibleRecords.map((record) => ({
    record,
    id: config.getId(record),
    actions: getActions(record),
    busy: Boolean(busyPath && config.actions?.some((action) => action.path(record) === busyPath)),
  }));
  const actionError = actState.isError
    ? (getErrorMessage(actState.error) ?? 'Не удалось выполнить действие.')
    : undefined;

  const handleCreate = () => {
    setDialog({ mode: 'create' });
  };

  const handleDialogClose = () => {
    setDialog(undefined);
  };

  const handleDetailsClose = () => {
    setDetails(undefined);
  };

  const handleReasonClose = () => {
    setReasonTarget(undefined);
  };

  const handleReasonConfirm = (reason: string) => {
    if (reasonTarget) {
      runAction(reasonTarget.action, reasonTarget.record, reason);
    }
  };

  return {
    filters,
    filtersVersion,
    filtersActive: Object.values(filters).some(Boolean),
    rows,
    tableStatus: getTableStatus(list, rows.length),
    refreshing: list.isFetching && Boolean(list.data),
    total: config.unpaginated ? allRecords.length : (list.data?.meta.total ?? 0),
    limit: pageSize,
    offset,
    dialog,
    details,
    reasonTarget,
    reasonPending: actState.isLoading,
    // Ошибку действия с причиной показываем в окне, остальных — над таблицей.
    reasonError: reasonTarget ? actionError : undefined,
    actionError: reasonTarget ? undefined : actionError,
    getRecordPath,
    handleFilterChange,
    handleResetFilters,
    handleOffsetChange: setOffset,
    handlePageSizeChange: (value: string) => {
      changePageSize(value);
      setOffset(0);
    },
    handleCreate,
    handleDialogClose,
    handleDetailsClose,
    handleReasonClose,
    handleReasonConfirm,
  };
};
