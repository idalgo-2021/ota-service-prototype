'use client';

import { Box, Heading, Skeleton, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useGetProductQuery } from '@/lib/api';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import { BackButton } from '@/shared/back-button';
import { CartPanel } from '../CartPanel';
import { ProductCard } from '../ProductCard';
import { ProductReviews } from '../ProductReviews';
import { useCart } from '../useCart';

export const ProductDetailsPage = ({
  id,
  participants = 1,
}: {
  id: string;
  participants?: number;
}) => {
  const { lang } = useCatalogLanguage();
  const product = useGetProductQuery({ id, lang });
  const cart = useCart();

  if (product.isError) {
    return (
      <Text w="100%" maxW="1100px" mx="auto" p={8}>
        Предложение не найдено или снято с публикации.
      </Text>
    );
  }
  if (!product.data) {
    return <Skeleton w="100%" maxW="1100px" mx="auto" my={8} h="420px" borderRadius="20px" />;
  }

  const location = [product.data.location_name, product.data.country_name]
    .filter(Boolean)
    .join(', ');
  const housing = product.data.location_id
    ? `/search?query=${encodeURIComponent(product.data.location_name ?? '')}&location_ids=${product.data.location_id}`
    : undefined;

  return (
    <Stack w="100%" maxW="1100px" mx="auto" px={{ base: 4, md: 8 }} py={8} gap={6}>
      <BackButton fallback="/products" />
      <Stack gap={1}>
        <Heading as="h1" fontSize={{ base: '30px', md: '42px' }}>
          {product.data.name}
        </Heading>
        {location && <Text color="gray.600">{location}</Text>}
      </Stack>
      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', md: 'minmax(0, 1fr) 340px' }}
        gap={6}
        alignItems="start"
      >
        <ProductCard
          product={product.data}
          getQuantity={cart.getQuantity}
          disabled={!cart.isSignedIn || cart.locked}
          defaultQuantity={participants}
          onQuantityChange={cart.handleQuantityChange}
        />
        <Stack gap={4} position={{ md: 'sticky' }} top={{ md: '88px' }}>
          <CartPanel cart={cart} mode="summary" />
          {housing && (
            <Link href={housing} style={{ color: '#0e41d2', fontWeight: 600 }}>
              Найти жилье в этой локации →
            </Link>
          )}
        </Stack>
      </Box>
      <ProductReviews productId={product.data.id} />
    </Stack>
  );
};
