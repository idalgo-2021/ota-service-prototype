import { skipToken, type FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { useState } from 'react';
import {
  useCancelMyBookingMutation,
  useGetMyBookingsQuery,
  type Booking,
  type CatalogLanguage,
} from '@/lib/api';
import { useAppSelector } from '@/lib/hooks';
import { useCancelFlow } from '@/shared/cancel-dialog';

const PAGE_SIZE = 10;

type Status = 'pending' | 'guest' | 'error' | 'loading' | 'empty' | 'ready';

// Бэкенд пишет ошибки по-английски для разработчиков, поэтому гостю объясняем по коду ответа.
const getCancelError = (error: unknown, lang: CatalogLanguage) => {
  const status = (error as FetchBaseQueryError | undefined)?.status;
  if (status === 400 || status === 409) {
    return lang === 'en'
      ? 'This booking can only be cancelled before check-in.'
      : 'Эту бронь уже нельзя отменить: отменить можно только до заезда.';
  }
  return lang === 'en'
    ? 'Could not cancel the booking. Please try again.'
    : 'Не удалось отменить бронь. Попробуйте еще раз.';
};

export const useController = (lang: CatalogLanguage) => {
  const { accessToken, restored } = useAppSelector((state) => state.auth);
  const [offset, setOffset] = useState(0);

  const bookings = useGetMyBookingsQuery(accessToken ? { limit: PAGE_SIZE, offset } : skipToken);
  const cancelFlow = useCancelFlow<Booking>(useCancelMyBookingMutation(), (error) =>
    getCancelError(error, lang)
  );

  const getStatus = (): Status => {
    if (!restored) {
      return 'pending';
    }
    if (!accessToken) {
      return 'guest';
    }
    if (bookings.isError) {
      return 'error';
    }
    if (!bookings.data) {
      return 'loading';
    }
    return bookings.data.items.length ? 'ready' : 'empty';
  };

  return {
    status: getStatus(),
    bookings: bookings.data?.items ?? [],
    total: bookings.data?.meta.total ?? 0,
    limit: PAGE_SIZE,
    offset,
    handleOffsetChange: setOffset,
    ...cancelFlow,
  };
};
