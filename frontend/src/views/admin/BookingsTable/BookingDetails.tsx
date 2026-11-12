'use client';

import { Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { CURRENCY, useGetAdminBookingQuery } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { DetailsDialog, DetailRow } from '../DetailsDialog';
import { formatDateTime } from '../format';
import { recordHref } from '../recordHref';
import { translateAdmin, useAdminLanguage } from '../adminLocale';

export const BookingDetails = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const lang = useAdminLanguage();
  const dateTime = (value?: string | null) => (value ? formatDateTime(value, lang) : '—');
  const { data: booking, isLoading, isError } = useGetAdminBookingQuery(id);
  const t = (text: string) => translateAdmin(text, lang);
  return (
    <DetailsDialog title={`Бронь ${id}`} onClose={onClose}>
      {isLoading && <Text>{t('Загружаем бронь…')}</Text>}
      {isError && <Text role="alert">{t('Не удалось загрузить бронь.')}</Text>}
      {booking && (
        <Stack gap="0">
          <DetailRow
            label="Клиент"
            value={
              <Link href={recordHref('clients', booking.user_id)}>
                {booking.client_name || booking.client_email || booking.user_id} ({booking.user_id})
              </Link>
            }
          />
          <DetailRow label="Почта клиента" value={booking.client_email} />
          <DetailRow
            label="Объект"
            value={
              <Link href={`/listings/${encodeURIComponent(booking.listing_id)}`}>
                {booking.listing_title_ru || booking.listing_title || booking.listing_id} (
                {booking.listing_id})
              </Link>
            }
          />
          <DetailRow
            label="Номера и места"
            value={
              booking.units
                ?.map(
                  (unit) =>
                    `${lang === 'en' ? unit.name : unit.name_ru || unit.name} (${unit.unit_id}, ${formatMoney(unit.price_per_night, CURRENCY)}/${lang === 'en' ? 'night' : 'ночь'})`
                )
                .join('; ') || booking.unit_ids.join(', ')
            }
          />
          <DetailRow
            label="Проживание"
            value={`${booking.check_in_date} — ${booking.check_out_date}`}
          />
          <DetailRow
            label="Состав"
            value={
              lang === 'en'
                ? `${booking.adults_count} adults, ${booking.children_count} children, pets: ${booking.has_pets ? 'yes' : 'no'}`
                : `${booking.adults_count} взр., ${booking.children_count} дет., питомцы: ${booking.has_pets ? 'да' : 'нет'}`
            }
          />
          <DetailRow label="Сумма" value={formatMoney(booking.total, booking.currency)} />
          <DetailRow
            label="Базовая сумма"
            value={booking.base_total && formatMoney(booking.base_total, CURRENCY)}
          />
          <DetailRow label="Статус" value={translateAdmin(booking.status, lang)} />
          <DetailRow label="Причина отмены" value={booking.cancellation_reason} />
          <DetailRow label="Отменено" value={dateTime(booking.canceled_at)} />
          <DetailRow label="Отменил" value={booking.canceled_by} />
          <DetailRow label="Заселено" value={dateTime(booking.checked_in_at)} />
          <DetailRow label="Заселил" value={booking.checked_in_by} />
          <DetailRow label="Выселено" value={dateTime(booking.completed_at)} />
          <DetailRow label="Выселил" value={booking.completed_by} />
          <DetailRow label="Курс валюты, ID" value={booking.rate_id} />
          <DetailRow label="Курс зафиксирован" value={dateTime(booking.quoted_at)} />
          <DetailRow label="Создана" value={dateTime(booking.created_at)} />
          <DetailRow label="Обновлена" value={dateTime(booking.updated_at)} />
        </Stack>
      )}
    </DetailsDialog>
  );
};
