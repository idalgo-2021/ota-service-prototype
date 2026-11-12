import { useState } from 'react';
import {
  getErrorMessage,
  useCancelAdminOrderMutation,
  useFulfillAdminOrderMutation,
  useGetAdminOrdersQuery,
  type AdminOrdersParams,
  type Order,
  type OrderStatus,
  type CatalogLanguage,
} from '@/lib/api';
import { useCancelFlow } from '@/shared/cancel-dialog';
import type { StatusTone } from '@/shared/status-badge';
import { getTableStatus, toOptions, toStatusOptions } from '../options';
import type { RowAction } from '../RowActions';
import { useTableFilters } from '../useTableFilters';
import { usePageSize } from '../usePageSize';
import { translateAdmin } from '../adminLocale';

const STATUSES: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Не оформлен', tone: 'canceled' },
  confirmed: { label: 'Ждет выполнения', tone: 'waiting' },
  fulfilled: { label: 'Выполнен', tone: 'done' },
  cancelled: { label: 'Отменен', tone: 'canceled' },
};

const SORTS = {
  created: { sortBy: 'created_at', sortOrder: 'desc', label: 'Сначала новые' },
  createdAsc: { sortBy: 'created_at', sortOrder: 'asc', label: 'Сначала старые' },
  fulfilled: { sortBy: 'fulfilled_at', sortOrder: 'desc', label: 'Недавно выполненные' },
} as const satisfies Record<
  string,
  Pick<AdminOrdersParams, 'sortBy' | 'sortOrder'> & { label: string }
>;

export const STATUS_OPTIONS = toStatusOptions(STATUSES);
export const SORT_OPTIONS = toOptions(SORTS);

export const useController = (lang: CatalogLanguage = 'ru') => {
  const [detailsId, setDetailsId] = useState<string>();
  const filters = useTableFilters<OrderStatus, keyof typeof SORTS>('created');
  const { pageSize, changePageSize } = usePageSize();
  const { status, dates, sort, offset } = filters;

  const orders = useGetAdminOrdersQuery({
    limit: pageSize,
    offset,
    status: status === 'all' ? undefined : status,
    createdFrom: dates.from,
    createdTo: dates.to,
    sortBy: SORTS[sort].sortBy,
    sortOrder: SORTS[sort].sortOrder,
  });

  const [fulfill, fulfillState] = useFulfillAdminOrderMutation();
  const cancelMutation = useCancelAdminOrderMutation();
  const cancelFlow = useCancelFlow<Order>(
    cancelMutation,
    (error) => getErrorMessage(error) ?? 'Не удалось отменить заказ.'
  );
  const cancelState = cancelMutation[1];

  const getActions = (order: Order): RowAction[] => {
    const view: RowAction = { label: 'Просмотр', onClick: () => setDetailsId(order.id) };
    const cancelAction: RowAction = {
      label: 'Отменить',
      danger: true,
      onClick: () => cancelFlow.handleCancelOpen(order),
    };
    switch (order.status) {
      case 'confirmed':
        return [view, { label: 'Выполнить', onClick: () => fulfill(order.id) }, cancelAction];
      case 'pending':
        return [view, cancelAction];
      default:
        return [view];
    }
  };

  const busyId =
    (fulfillState.isLoading && fulfillState.originalArgs) ||
    (cancelState.isLoading && cancelState.originalArgs?.id) ||
    undefined;

  const rows = (orders.data?.items ?? []).map((order) => ({
    order,
    items: order.items.map((item) => ({
      ...item,
      name: lang === 'en' ? item.product_name : item.product_name_ru || item.product_name,
    })),
    status: {
      ...STATUSES[order.status],
      label: translateAdmin(STATUSES[order.status].label, lang),
    },
    actions: getActions(order),
    busy: order.id === busyId,
  }));

  return {
    filters,
    rows,
    tableStatus: getTableStatus(orders, rows.length),
    refreshing: orders.isFetching && !!orders.data,
    total: orders.data?.meta.total ?? 0,
    limit: pageSize,
    detailsId,
    handleDetailsClose: () => setDetailsId(undefined),
    handlePageSizeChange: (value: string) => {
      changePageSize(value);
      filters.handleOffsetChange(0);
    },
    actionError: fulfillState.isError
      ? translateAdmin(
          getErrorMessage(fulfillState.error) ?? 'Не удалось отметить заказ выполненным.',
          lang
        )
      : undefined,
    ...cancelFlow,
  };
};
