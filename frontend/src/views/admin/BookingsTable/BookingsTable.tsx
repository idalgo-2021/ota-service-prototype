'use client';

import { HStack, Stack, Text } from '@chakra-ui/react';
import { formatMoney } from '@/lib/format';
import { formatIsoDate } from '@/shared/date-range-picker';
import { CancelDialog } from '@/shared/cancel-dialog';
import { Pagination } from '@/shared/pagination';
import { StatusBadge } from '@/shared/status-badge';
import { AdminTable, type AdminColumn } from '../AdminTable';
import { PageSizeSelect } from '../PageSizeSelect';
import { shortId } from '../format';
import { RowActions } from '../RowActions';
import { TableFilters } from '../TableFilters';
import { errorStyle, primaryTextStyle, rootStyle, secondaryTextStyle } from '../table.styles';
import { SORT_OPTIONS, STATUS_OPTIONS, useController } from './useController';
import { BookingDetails } from './BookingDetails';
import { translateAdmin, useAdminLanguage } from '../adminLocale';
import type { CatalogLanguage } from '@/lib/api';
import { listingsConfig } from '../resources/configs/catalog';
import { RelatedRecordButton, RelatedRecordThumbnail } from '../resources/RelatedRecordButton';
import { MediaThumbnail } from '../resources/configs/MediaThumbnail';

type Row = ReturnType<typeof useController>['rows'][number];

const formatGuests = (
  { adults_count, children_count, has_pets }: Row['booking'],
  lang: CatalogLanguage
) =>
  [
    lang === 'en' ? `${adults_count} adults` : `${adults_count} взр.`,
    children_count
      ? lang === 'en'
        ? `${children_count} children`
        : `${children_count} дет.`
      : null,
    has_pets ? (lang === 'en' ? 'with a pet' : 'с питомцем') : null,
  ]
    .filter(Boolean)
    .join(', ');

const getRowKey = (row: Row) => row.booking.id;

const getColumns = (lang: CatalogLanguage): AdminColumn<Row>[] => [
  {
    key: 'listing',
    title: 'Объект',
    render: ({ booking, listingTitle }) => {
      const title = listingTitle ?? shortId(booking.listing_id);
      return (
        <HStack align="center" gap="3">
          <RelatedRecordThumbnail config={listingsConfig} id={booking.listing_id} label={title}>
            <MediaThumbnail src={booking.listing_thumbnail_url ?? undefined} alt="Фото объекта" />
          </RelatedRecordThumbnail>
          <RelatedRecordButton
            config={listingsConfig}
            id={booking.listing_id}
            main={title}
            maxWidth="200px"
          />
        </HStack>
      );
    },
  },
  {
    key: 'guest',
    title: 'Гость',
    render: ({ booking }) => (
      <>
        <Text {...primaryTextStyle} title={booking.user_id}>
          {booking.client_name || booking.client_email || shortId(booking.user_id)}
        </Text>
        <Text {...secondaryTextStyle}>{formatGuests(booking, lang)}</Text>
      </>
    ),
  },
  {
    key: 'dates',
    title: 'Проживание',
    render: ({ booking }) => (
      <Text {...primaryTextStyle}>
        {formatIsoDate(booking.check_in_date, { locale: lang === 'en' ? 'en-US' : 'ru-RU' })} —{' '}
        {formatIsoDate(booking.check_out_date, { locale: lang === 'en' ? 'en-US' : 'ru-RU' })}
      </Text>
    ),
  },
  {
    key: 'total',
    title: 'Сумма',
    render: ({ booking }) => (
      <Text {...primaryTextStyle}>{formatMoney(booking.total, booking.currency)}</Text>
    ),
  },
  {
    key: 'status',
    title: 'Статус',
    render: ({ booking, status }) => (
      <>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        {booking.cancellation_reason && (
          <Text {...secondaryTextStyle} title={booking.cancellation_reason}>
            {booking.cancellation_reason}
          </Text>
        )}
      </>
    ),
  },
  {
    key: 'actions',
    title: 'Действия',
    render: ({ actions, busy }) => <RowActions actions={actions} disabled={busy} />,
  },
];

/**
 * Все брони для сотрудника: фильтры по статусу и датам заезда, сортировка, таблица
 * с кнопками заселения, выселения и отмены и пагинация. Отмена спрашивает причину в окне.
 */
export const BookingsTable = () => {
  const lang = useAdminLanguage();
  const t = (text: string) => translateAdmin(text, lang);
  const {
    filters,
    rows,
    tableStatus,
    refreshing,
    total,
    limit,
    detailsId,
    handleDetailsClose,
    handlePageSizeChange,
    actionError,
    cancelTarget,
    cancelPending,
    cancelError,
    handleCancelClose,
    handleCancelConfirm,
  } = useController(lang);

  return (
    <Stack {...rootStyle}>
      <TableFilters
        filters={filters}
        statusOptions={STATUS_OPTIONS}
        sortOptions={SORT_OPTIONS}
        datesLabel="Заезд"
        datesTitle="Даты заезда"
      />
      <PageSizeSelect value={limit} onChange={handlePageSizeChange} />

      {actionError && <Text {...errorStyle}>{actionError}</Text>}

      <AdminTable
        tableId="bookings"
        columns={getColumns(lang)}
        rows={rows}
        getRowKey={getRowKey}
        status={tableStatus}
        refreshing={refreshing}
        emptyText={t('Броней по этим условиям нет.')}
      />

      {total > 0 && (
        <Pagination
          lang={lang}
          total={total}
          limit={limit}
          offset={filters.offset}
          onOffsetChange={filters.handleOffsetChange}
        />
      )}

      {cancelTarget && (
        <CancelDialog
          lang={lang}
          subject={`бронь ${shortId(cancelTarget.id)}`}
          reasonRequired
          pending={cancelPending}
          error={cancelError}
          onConfirm={handleCancelConfirm}
          onClose={handleCancelClose}
        />
      )}
      {detailsId && <BookingDetails id={detailsId} onClose={handleDetailsClose} />}
    </Stack>
  );
};
