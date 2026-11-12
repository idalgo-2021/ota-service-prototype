'use client';

import { Flex, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import type { CatalogLanguage, OrderItem } from '@/lib/api';
import { ProfileThumbnail } from '@/shared/profile-thumbnail/ProfileThumbnail';
import { itemDateStyle, itemRowStyle } from './OrderCard.styles';

/** Позиция заказа: название продукта, дата экскурсии и количество. */
export const OrderItemRow = ({ item, lang }: { item: OrderItem; lang: CatalogLanguage }) => {
  const name =
    (lang === 'en'
      ? item.product_name || item.product_name_ru
      : item.product_name_ru || item.product_name) || (lang === 'en' ? 'Product' : 'Продукт');
  const date = item.date
    ? new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${item.date.slice(0, 10)}T00:00:00`))
    : null;

  return (
    <Flex {...itemRowStyle}>
      <ProfileThumbnail
        href={`/products/${item.product_id}`}
        label={name}
        src={item.product_thumbnail_url}
      />
      <Stack gap="1" flex="1" minW="0">
        <Text lineClamp={2}>
          <Link href={`/products/${item.product_id}`}>{name}</Link>
        </Text>
        {date && <Text {...itemDateStyle}>{date}</Text>}
      </Stack>
      <Text flexShrink={0}>× {item.quantity}</Text>
    </Flex>
  );
};
