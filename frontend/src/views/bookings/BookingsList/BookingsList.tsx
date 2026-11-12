'use client';

import { Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import type { CatalogLanguage } from '@/lib/api';
import { CancelDialog } from '@/shared/cancel-dialog';
import { Pagination } from '@/shared/pagination';
import { ProfileLink } from '@/shared/profile-link';
import { ProfileTable } from '@/shared/profile-table/ProfileTable';
import { ResultPlaceholder } from '@/shared/result-placeholder';
import { BookingCard } from '../BookingCard';
import {
  listStyle,
  messageStyle,
  rootStyle,
  successLinkStyle,
  successStyle,
  warningStyle,
} from './BookingsList.styles';
import { useController } from './useController';

const COPY = {
  ru: {
    guest: 'Войдите через кнопку «Войти» вверху страницы, чтобы увидеть свои брони.',
    error: 'Не удалось загрузить брони. Попробуйте обновить страницу.',
    empty: 'Броней пока нет. Найдите жилье на главной и забронируйте его.',
    confirmedWithServices: 'Бронь и услуги оформлены. Ждем вас! Заказ услуг — в',
    orders: '«Заказах»',
    confirmed: 'Бронь оформлена. Ждем вас!',
    addServices: 'Добавить к поездке экскурсии и услуги →',
    servicesFailed:
      'Бронь оформлена, а услуги — нет: возможно, изменились цены. Они остались в корзине.',
    checkServices: 'Проверить и оформить →',
    bookingSubject: 'бронь',
    listing: 'Объект',
    stay: 'Проживание и гости',
    status: 'Статус и сумма',
    actions: 'Действия',
  },
  en: {
    guest: 'Sign in to see your bookings.',
    error: 'Could not load bookings. Try refreshing the page.',
    empty: 'No bookings yet. Find and book accommodation on the home page.',
    confirmedWithServices: 'Your booking and services are confirmed. See your services in',
    orders: 'Orders',
    confirmed: 'Your booking is confirmed. We look forward to seeing you!',
    addServices: 'Add tours and services to your trip →',
    servicesFailed:
      'Your booking is confirmed, but the services could not be placed. They remain in your cart; prices may have changed.',
    checkServices: 'Review and place order →',
    bookingSubject: 'booking',
    listing: 'Accommodation',
    stay: 'Stay and guests',
    status: 'Status and total',
    actions: 'Actions',
  },
};

type BookingsListProps = {
  lang: CatalogLanguage;
  /** Только что оформленная бронь: над списком — сообщение об успехе, её карточка выделена */
  createdId?: string;
  /** Услуги из корзины, оформленные вместе с бронью: оформились или нет */
  services?: 'confirmed' | 'failed';
};

/**
 * Брони гостя от новых к старым: объект, даты, гости, сумма и статус, у будущих — кнопка
 * отмены с причиной, а при нескольких страницах — пагинация. Гостю без входа объясняет,
 * что нужно войти. После брони сообщает, оформились ли вместе с ней услуги из корзины.
 */
export const BookingsList = ({ lang, createdId, services }: BookingsListProps) => {
  const {
    status,
    bookings,
    total,
    limit,
    offset,
    cancelTarget,
    cancelPending,
    cancelError,
    handleOffsetChange,
    handleCancelOpen,
    handleCancelClose,
    handleCancelConfirm,
  } = useController(lang);
  const t = COPY[lang];

  const renderList = () => {
    if (status === 'pending') {
      return null;
    }
    if (status === 'loading') {
      return (
        <>
          <ResultPlaceholder />
          <ResultPlaceholder />
        </>
      );
    }
    if (status !== 'ready') {
      return <Text {...messageStyle}>{t[status]}</Text>;
    }
    return (
      <ProfileTable>
        <thead>
          <tr>
            <th>{t.listing}</th>
            <th>{t.stay}</th>
            <th>{t.status}</th>
            <th>{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              lang={lang}
              highlighted={booking.id === createdId}
              onCancel={() => handleCancelOpen(booking)}
            />
          ))}
        </tbody>
      </ProfileTable>
    );
  };

  return (
    <Stack {...rootStyle}>
      {createdId && status === 'ready' && services !== 'failed' && (
        <Text {...successStyle}>
          {services === 'confirmed' ? (
            <>
              {t.confirmedWithServices}{' '}
              <ProfileLink tab="orders" replace style={successLinkStyle}>
                {t.orders}
              </ProfileLink>
              .
            </>
          ) : (
            <>
              {t.confirmed}{' '}
              <Link href={`/bookings/${createdId}/services`} style={successLinkStyle}>
                {t.addServices}
              </Link>
            </>
          )}
        </Text>
      )}
      {createdId && status === 'ready' && services === 'failed' && (
        <Text {...warningStyle}>
          {t.servicesFailed}{' '}
          <Link href={`/bookings/${createdId}/services`} style={successLinkStyle}>
            {t.checkServices}
          </Link>
        </Text>
      )}
      <Stack {...listStyle}>{renderList()}</Stack>
      {status === 'ready' && total > limit && (
        <Pagination
          lang={lang}
          total={total}
          limit={limit}
          offset={offset}
          onOffsetChange={handleOffsetChange}
        />
      )}
      {cancelTarget && (
        <CancelDialog
          lang={lang}
          subject={t.bookingSubject}
          reasonRequired
          pending={cancelPending}
          error={cancelError}
          onConfirm={handleCancelConfirm}
          onClose={handleCancelClose}
        />
      )}
    </Stack>
  );
};
