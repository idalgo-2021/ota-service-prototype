'use client';

import { Flex, Skeleton, Stack, Text } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/format';
import { Button } from '@/shared/button';
import { Card } from '@/shared/card';
import { ProfileLink } from '@/shared/profile-link';
import { CartLine } from '../CartLine';
import type { Cart } from '../useCart';
import {
  checkoutStyle,
  errorStyle,
  linkStyle,
  messageStyle,
  rootStyle,
  successStyle,
  titleStyle,
  totalRowStyle,
  totalStyle,
} from './CartPanel.styles';

type CartPanelProps = {
  cart: Cart;
  /** В каталоге ведёт в корзину; на странице корзины подтверждает заказ. */
  mode?: 'summary' | 'checkout';
  /** Фиксированная связь с поездкой — только при входе из конкретной брони. */
  bookingId?: string;
};

/**
 * Корзина рядом с витриной: позиции с количеством и ценой, итог и кнопка «Оформить заказ».
 * Гостю объясняет, что для заказа нужно войти; после оформления ведёт к заказам.
 */
export const CartPanel = ({ cart, mode = 'checkout', bookingId }: CartPanelProps) => {
  const router = useRouter();
  const renderContent = () => {
    if (!cart.authRestored) {
      return null;
    }
    if (!cart.isSignedIn) {
      return (
        <Text {...messageStyle}>
          Войдите через кнопку «Войти» вверху страницы, чтобы заказать экскурсии и услуги.
        </Text>
      );
    }
    if (cart.loading) {
      return <Skeleton h="80px" borderRadius="12px" />;
    }
    if (!cart.items.length) {
      return <Text {...messageStyle}>Добавьте экскурсии и услуги — оформим их одним заказом.</Text>;
    }
    return (
      <>
        <Stack gap="0">
          {cart.items.map((item) => (
            <CartLine
              key={`${item.product_id}:${item.date ?? ''}`}
              item={item}
              disabled={cart.locked}
              onQuantityChange={cart.handleQuantityChange}
            />
          ))}
        </Stack>
        <Flex {...totalRowStyle}>
          <Text {...totalStyle}>Итого</Text>
          {cart.total !== undefined && cart.currency ? (
            <Text {...totalStyle}>{formatMoney(cart.total, cart.currency)}</Text>
          ) : (
            <Text {...messageStyle}>Считаем…</Text>
          )}
        </Flex>
        <Button
          {...checkoutStyle}
          disabled={cart.syncing || cart.locked}
          loading={cart.checkoutPending}
          onClick={() => {
            if (mode === 'summary') {
              router.push(
                bookingId ? `/cart?booking_id=${encodeURIComponent(bookingId)}` : '/cart'
              );
            } else {
              cart.handleCheckout(bookingId);
            }
          }}
        >
          {mode === 'summary' ? 'Перейти в корзину' : 'Оформить заказ'}
        </Button>
      </>
    );
  };

  return (
    <Card {...rootStyle}>
      <Text {...titleStyle}>Корзина</Text>
      {cart.confirmedId && (
        <Text {...successStyle}>
          Заказ оформлен. Следите за ним в{' '}
          <ProfileLink tab="orders" style={linkStyle}>
            профиле
          </ProfileLink>
          .
        </Text>
      )}
      {bookingId && <Text {...messageStyle}>Заказ будет добавлен к выбранной поездке.</Text>}
      {renderContent()}
      {cart.error && <Text {...errorStyle}>{cart.error}</Text>}
    </Card>
  );
};
