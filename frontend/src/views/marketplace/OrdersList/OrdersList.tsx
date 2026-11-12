'use client';

import { Stack, Text } from '@chakra-ui/react';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import { Pagination } from '@/shared/pagination';
import { CancelDialog } from '@/shared/cancel-dialog';
import { ProfileTable } from '@/shared/profile-table/ProfileTable';
import { ResultPlaceholder } from '@/shared/result-placeholder';
import { OrderCard } from '../OrderCard';
import { listStyle, messageStyle, rootStyle } from './OrdersList.styles';
import { useController } from './useController';

const MESSAGES = {
  ru: {
    guest: 'Войдите через кнопку «Войти» вверху страницы, чтобы увидеть свои заказы.',
    error: 'Не удалось загрузить заказы. Попробуйте обновить страницу.',
    empty: 'Оформленных заказов пока нет. Выберите впечатление в каталоге.',
    products: 'Продукты',
    order: 'Заказ и детали',
    status: 'Статус и сумма',
    actions: 'Действия',
  },
  en: {
    guest: 'Sign in to see your orders.',
    error: 'Could not load orders. Try refreshing the page.',
    empty: 'No placed orders yet. Choose an experience in the catalog.',
    products: 'Products',
    order: 'Order details',
    status: 'Status and total',
    actions: 'Actions',
  },
};

/** Заказы экскурсий, услуг и товаров гостя от новых к старым, с пагинацией. */
export const OrdersList = () => {
  const { lang } = useCatalogLanguage();
  const {
    status,
    orders,
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
      return <Text {...messageStyle}>{MESSAGES[lang][status]}</Text>;
    }
    return (
      <ProfileTable>
        <thead>
          <tr>
            <th>{MESSAGES[lang].products}</th>
            <th>{MESSAGES[lang].order}</th>
            <th>{MESSAGES[lang].status}</th>
            <th>{MESSAGES[lang].actions}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} lang={lang} onCancel={handleCancelOpen} />
          ))}
        </tbody>
      </ProfileTable>
    );
  };

  return (
    <Stack {...rootStyle}>
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
          subject={lang === 'en' ? 'order' : 'заказ'}
          reasonRequired={false}
          pending={cancelPending}
          error={cancelError}
          onConfirm={handleCancelConfirm}
          onClose={handleCancelClose}
        />
      )}
    </Stack>
  );
};
