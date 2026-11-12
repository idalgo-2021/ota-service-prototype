'use client';

import { Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { colors } from '@/shared/colors';
import { formatMoney } from '@/lib/format';
import { formatIsoDate } from '@/shared/date-range-picker';
import { CancelDialog } from '@/shared/cancel-dialog';
import { Pagination } from '@/shared/pagination';
import { StatusBadge } from '@/shared/status-badge';
import { AdminTable, type AdminColumn } from '../AdminTable';
import { PageSizeSelect } from '../PageSizeSelect';
import { formatDateTime, shortId } from '../format';
import { RowActions } from '../RowActions';
import { TableFilters } from '../TableFilters';
import { errorStyle, primaryTextStyle, rootStyle, secondaryTextStyle } from '../table.styles';
import { SORT_OPTIONS, STATUS_OPTIONS, useController } from './useController';
import { OrderDetails } from './OrderDetails';
import { translateAdmin, useAdminLanguage } from '../adminLocale';
import type { CatalogLanguage } from '@/lib/api';

type Row = ReturnType<typeof useController>['rows'][number];

const getRowKey = (row: Row) => row.order.id;

const getColumns = (lang: CatalogLanguage): AdminColumn<Row>[] => [
  {
    key: 'client',
    title: 'Клиент',
    render: ({ order }) => (
      <Text {...primaryTextStyle} title={order.user_id}>
        {order.client_name || order.client_email || shortId(order.user_id)}
      </Text>
    ),
  },
  {
    key: 'items',
    title: 'Состав',
    render: ({ items }) =>
      items.map((item, index) => (
        <Text key={`${item.product_id}-${item.date ?? index}`}>
          <Link
            href={`/products/${encodeURIComponent(item.product_id)}`}
            style={{ color: colors.primary, fontWeight: 600 }}
          >
            {item.name ?? shortId(item.product_id)} × {item.quantity}
          </Link>
          {item.date && (
            <Text as="span" {...secondaryTextStyle}>
              {' '}
              {lang === 'en' ? 'on' : 'на'}{' '}
              {formatIsoDate(item.date, { locale: lang === 'en' ? 'en-US' : 'ru-RU' })}
            </Text>
          )}
        </Text>
      )),
  },
  {
    key: 'total',
    title: 'Сумма',
    render: ({ order }) => (
      <Text {...primaryTextStyle}>{formatMoney(order.total, order.currency)}</Text>
    ),
  },
  {
    key: 'status',
    title: 'Статус',
    render: ({ order, status }) => (
      <>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        {order.fulfilled_at && (
          <Text {...secondaryTextStyle}>{formatDateTime(order.fulfilled_at, lang)}</Text>
        )}
        {order.cancellation_reason && (
          <Text {...secondaryTextStyle} title={order.cancellation_reason}>
            {order.cancellation_reason}
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
 * Все заказы услуг для сотрудника: фильтры по статусу и дате создания, сортировка, таблица
 * с кнопками выполнения и отмены и пагинация. Отмена спрашивает причину в окне.
 */
export const OrdersTable = () => {
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
        datesLabel="Дата создания"
        datesTitle="Даты создания"
      />
      <PageSizeSelect value={limit} onChange={handlePageSizeChange} />

      {actionError && <Text {...errorStyle}>{actionError}</Text>}

      <AdminTable
        tableId="orders"
        columns={getColumns(lang)}
        rows={rows}
        getRowKey={getRowKey}
        status={tableStatus}
        refreshing={refreshing}
        emptyText={t('Заказов по этим условиям нет.')}
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
          subject={`заказ ${shortId(cancelTarget.id)}`}
          reasonRequired
          pending={cancelPending}
          error={cancelError}
          onConfirm={handleCancelConfirm}
          onClose={handleCancelClose}
        />
      )}
      {detailsId && <OrderDetails id={detailsId} onClose={handleDetailsClose} />}
    </Stack>
  );
};
