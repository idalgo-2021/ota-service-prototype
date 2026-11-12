'use client';

import { Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { CURRENCY, useGetAdminOrderQuery } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { DetailsDialog, DetailRow } from '../DetailsDialog';
import { formatDateTime } from '../format';
import { recordHref } from '../recordHref';
import { translateAdmin, useAdminLanguage } from '../adminLocale';

export const OrderDetails = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const lang = useAdminLanguage();
  const t = (text: string) => translateAdmin(text, lang);
  const dateTime = (value?: string | null) => (value ? formatDateTime(value, lang) : '—');
  const { data: order, isLoading, isError } = useGetAdminOrderQuery(id);
  return (
    <DetailsDialog title={`Заказ ${id}`} onClose={onClose}>
      {isLoading && <Text>{t('Загружаем заказ…')}</Text>}
      {isError && <Text role="alert">{t('Не удалось загрузить заказ.')}</Text>}
      {order && (
        <Stack gap="0">
          <DetailRow
            label="Клиент"
            value={
              <Link href={recordHref('clients', order.user_id)}>
                {order.client_name || order.client_email || order.user_id} ({order.user_id})
              </Link>
            }
          />
          <DetailRow label="Почта клиента" value={order.client_email} />
          <DetailRow
            label="Состав"
            value={
              <Stack gap="4px">
                {order.items.map((item, index) => (
                  <Link
                    key={`${item.product_id}-${index}`}
                    href={`/products/${encodeURIComponent(item.product_id)}`}
                  >
                    {(lang === 'en'
                      ? item.product_name
                      : item.product_name_ru || item.product_name) || item.product_id}{' '}
                    × {item.quantity}
                    {item.date ? ` ${lang === 'en' ? 'on' : 'на'} ${item.date}` : ''}
                  </Link>
                ))}
              </Stack>
            }
          />
          <DetailRow label="Сумма" value={formatMoney(order.total, order.currency)} />
          <DetailRow
            label="Базовая сумма"
            value={order.base_total && formatMoney(order.base_total, CURRENCY)}
          />
          <DetailRow label="Статус" value={translateAdmin(order.status, lang)} />
          <DetailRow label="Причина отмены" value={order.cancellation_reason} />
          <DetailRow label="Отменен" value={dateTime(order.cancelled_at)} />
          <DetailRow label="Отменил" value={order.cancelled_by} />
          <DetailRow label="Выполнен" value={dateTime(order.fulfilled_at)} />
          <DetailRow label="Модератор" value={order.moderated_by} />
          <DetailRow label="Модерирован" value={dateTime(order.moderated_at)} />
          <DetailRow label="Курс валюты, ID" value={order.rate_id} />
          <DetailRow label="Курс зафиксирован" value={dateTime(order.quoted_at)} />
          <DetailRow label="Создан" value={dateTime(order.created_at)} />
          <DetailRow label="Обновлен" value={dateTime(order.updated_at)} />
        </Stack>
      )}
    </DetailsDialog>
  );
};
