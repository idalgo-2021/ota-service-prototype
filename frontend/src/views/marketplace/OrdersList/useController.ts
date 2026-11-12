import { skipToken, type FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { useState } from 'react';
import {
  useCancelMyOrderMutation,
  useGetMyOrdersQuery,
  type CatalogLanguage,
  type Order,
} from '@/lib/api';
import { useAppSelector } from '@/lib/hooks';
import { useCancelFlow } from '@/shared/cancel-dialog';

const PAGE_SIZE = 10;

type Status = 'pending' | 'guest' | 'error' | 'loading' | 'empty' | 'ready';

const getCancelError = (error: unknown, lang: CatalogLanguage) => {
  const status = (error as FetchBaseQueryError | undefined)?.status;
  if (status === 400 || status === 409) {
    return lang === 'en'
      ? 'This order can no longer be cancelled.'
      : 'Этот заказ уже нельзя отменить: он выполнен или отменен ранее.';
  }
  return lang === 'en'
    ? 'Could not cancel the order. Please try again.'
    : 'Не удалось отменить заказ. Попробуйте еще раз.';
};

export const useController = (lang: CatalogLanguage) => {
  const { accessToken, restored } = useAppSelector((state) => state.auth);
  const [offset, setOffset] = useState(0);
  const orders = useGetMyOrdersQuery(
    accessToken
      ? { limit: PAGE_SIZE, offset, status: ['confirmed', 'fulfilled', 'cancelled'] }
      : skipToken
  );
  const cancelFlow = useCancelFlow<Order>(useCancelMyOrderMutation(), (error) =>
    getCancelError(error, lang)
  );

  const getStatus = (): Status => {
    if (!restored) {
      return 'pending';
    }
    if (!accessToken) {
      return 'guest';
    }
    if (orders.isError) {
      return 'error';
    }
    if (!orders.data) {
      return 'loading';
    }
    return orders.data.items.length ? 'ready' : 'empty';
  };

  return {
    status: getStatus(),
    orders: orders.data?.items ?? [],
    total: orders.data?.meta.total ?? 0,
    limit: PAGE_SIZE,
    offset,
    handleOffsetChange: setOffset,
    ...cancelFlow,
  };
};
