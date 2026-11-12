import { useState } from 'react';
import {
  getErrorMessage,
  useCancelAdminBookingMutation,
  useCheckInBookingMutation,
  useCheckOutBookingMutation,
  useGetAdminBookingsQuery,
  type AdminBookingsParams,
  type Booking,
  type BookingStatus,
  type CatalogLanguage,
} from '@/lib/api';
import { useCancelFlow } from '@/shared/cancel-dialog';
import type { StatusTone } from '@/shared/status-badge';
import { getTableStatus, toOptions, toStatusOptions } from '../options';
import type { RowAction } from '../RowActions';
import { useTableFilters } from '../useTableFilters';
import { usePageSize } from '../usePageSize';
import { translateAdmin } from '../adminLocale';

const STATUSES: Record<BookingStatus, { label: string; tone: StatusTone }> = {
  confirmed: { label: 'Ждет заезда', tone: 'waiting' },
  checked_in: { label: 'Проживает', tone: 'active' },
  completed: { label: 'Завершена', tone: 'done' },
  canceled: { label: 'Отменена', tone: 'canceled' },
};

const SORTS = {
  created: { sortBy: 'created_at', sortOrder: 'desc', label: 'Сначала новые' },
  checkInAsc: { sortBy: 'check_in_date', sortOrder: 'asc', label: 'Заезд: ближайшие' },
  checkInDesc: { sortBy: 'check_in_date', sortOrder: 'desc', label: 'Заезд: поздние' },
} as const satisfies Record<
  string,
  Pick<AdminBookingsParams, 'sortBy' | 'sortOrder'> & { label: string }
>;

export const STATUS_OPTIONS = toStatusOptions(STATUSES);
export const SORT_OPTIONS = toOptions(SORTS);

export const useController = (lang: CatalogLanguage = 'ru') => {
  const [detailsId, setDetailsId] = useState<string>();
  const filters = useTableFilters<BookingStatus, keyof typeof SORTS>('created');
  const { pageSize, changePageSize } = usePageSize();
  const { status, dates, sort, offset } = filters;

  const bookings = useGetAdminBookingsQuery({
    limit: pageSize,
    offset,
    status: status === 'all' ? undefined : status,
    checkInFrom: dates.from,
    checkInTo: dates.to,
    sortBy: SORTS[sort].sortBy,
    sortOrder: SORTS[sort].sortOrder,
  });

  const [checkIn, checkInState] = useCheckInBookingMutation();
  const [checkOut, checkOutState] = useCheckOutBookingMutation();
  const cancelMutation = useCancelAdminBookingMutation();
  const cancelFlow = useCancelFlow<Booking>(
    cancelMutation,
    (error) => getErrorMessage(error) ?? 'Не удалось отменить бронь.'
  );
  const cancelState = cancelMutation[1];

  // Показываем ошибку только последнего действия: новый запуск сбрасывает ошибку своей мутации,
  // а ошибку соседней сбрасываем сами.
  const handleCheckIn = (id: string) => {
    checkOutState.reset();
    checkIn(id);
  };
  const handleCheckOut = (id: string) => {
    checkInState.reset();
    checkOut(id);
  };

  const getActions = (booking: Booking): RowAction[] => {
    const view: RowAction = { label: 'Просмотр', onClick: () => setDetailsId(booking.id) };
    switch (booking.status) {
      case 'confirmed':
        return [
          view,
          { label: 'Заселить', onClick: () => handleCheckIn(booking.id) },
          { label: 'Отменить', danger: true, onClick: () => cancelFlow.handleCancelOpen(booking) },
        ];
      case 'checked_in':
        return [view, { label: 'Выселить', onClick: () => handleCheckOut(booking.id) }];
      default:
        return [view];
    }
  };

  const busyId =
    (checkInState.isLoading && checkInState.originalArgs) ||
    (checkOutState.isLoading && checkOutState.originalArgs) ||
    (cancelState.isLoading && cancelState.originalArgs?.id) ||
    undefined;

  const rows = (bookings.data?.items ?? []).map((booking) => ({
    booking,
    listingTitle:
      lang === 'en' ? booking.listing_title : booking.listing_title_ru || booking.listing_title,
    status: {
      ...STATUSES[booking.status],
      label: translateAdmin(STATUSES[booking.status].label, lang),
    },
    actions: getActions(booking),
    busy: booking.id === busyId,
  }));

  const actionError =
    (checkInState.isError &&
      (getErrorMessage(checkInState.error) ?? 'Не удалось заселить гостя.')) ||
    (checkOutState.isError &&
      (getErrorMessage(checkOutState.error) ?? 'Не удалось выселить гостя.')) ||
    undefined;

  return {
    filters,
    rows,
    tableStatus: getTableStatus(bookings, rows.length),
    refreshing: bookings.isFetching && !!bookings.data,
    total: bookings.data?.meta.total ?? 0,
    limit: pageSize,
    detailsId,
    handleDetailsClose: () => setDetailsId(undefined),
    handlePageSizeChange: (value: string) => {
      changePageSize(value);
      filters.handleOffsetChange(0);
    },
    actionError: actionError && translateAdmin(actionError, lang),
    ...cancelFlow,
  };
};
