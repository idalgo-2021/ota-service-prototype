'use client';

import { Heading, Stack } from '@chakra-ui/react';
import { BackButton } from '@/shared/back-button';
import { CartPanel } from '../CartPanel';
import { useCart } from '../useCart';

export const CartPage = ({
  bookingId,
  modal = false,
}: {
  bookingId?: string;
  modal?: boolean;
}) => {
  const cart = useCart();
  return (
    <Stack w="100%" maxW="720px" mx="auto" px={{ base: 4, md: 8 }} py={8} gap={6}>
      {!modal && <BackButton fallback="/products" />}
      {!modal && (
        <Heading as="h1" fontSize={{ base: '30px', md: '42px' }}>
          Корзина
        </Heading>
      )}
      <CartPanel cart={cart} bookingId={bookingId} />
    </Stack>
  );
};
