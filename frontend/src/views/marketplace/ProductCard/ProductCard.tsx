'use client';

import { Flex, NativeSelect, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import type { Product } from '@/lib/api';
import { formatCount, formatMoney } from '@/lib/format';
import { CartButton } from '@/shared/cart-button';
import { Card } from '@/shared/card';
import { ImageCarousel, orderedImageUrls } from '@/shared/image-carousel';
import { StarIcon } from '@/shared/icons';
import type { TripDates } from '../products';
import { MAX_QUANTITY, type CartItemKey } from '../useCart';
import {
  bodyStyle,
  cardStyle,
  dateSelectStyle,
  descriptionStyle,
  factsStyle,
  footerStyle,
  imageStyle,
  priceRowStyle,
  priceStyle,
  titleStyle,
  typeStyle,
} from './ProductCard.styles';
import { useController } from './useController';

type ProductCardProps = {
  product: Product;
  /** Даты поездки: экскурсии предлагаем только в эти дни */
  trip?: TripDates;
  /** Сколько штук позиции уже в корзине */
  getQuantity: (item: CartItemKey) => number;
  /** Менять корзину нельзя: гость не вошёл или заказ оформляется */
  disabled: boolean;
  defaultQuantity?: number;
  onQuantityChange: (item: CartItemKey, quantity: number) => void;
};

/**
 * Карточка предложения на витрине: фото, вид и продавец, название, описание, главные
 * характеристики, цена и кнопка корзины со счётчиком. У экскурсии с расписанием — выбор
 * даты из подходящих дней; счётчик относится к выбранной дате.
 */
export const ProductCard = ({
  product,
  trip,
  getQuantity,
  disabled,
  defaultQuantity = 1,
  onQuantityChange,
}: ProductCardProps) => {
  const detailsHref = `/products/${encodeURIComponent(product.id)}?participants=${Math.max(
    1,
    defaultQuantity
  )}`;
  const {
    typeLabel,
    facts,
    scheduled,
    scheduleText,
    dates,
    date,
    quantity,
    unavailable,
    unscheduledTour,
    handleDateChange,
    handleQuantityChange,
  } = useController(product, trip, getQuantity, onQuantityChange);
  const images = orderedImageUrls(product.thumbnail?.url, product.images);

  return (
    <Card {...cardStyle}>
      <ImageCarousel images={images} title={product.name} imageStyle={imageStyle} />
      <Stack {...bodyStyle}>
        <Text {...typeStyle}>
          {[typeLabel, product.counterparty_name].filter(Boolean).join(' · ')}
        </Text>
        <Link href={detailsHref}>
          <Text {...titleStyle}>{product.name}</Text>
        </Link>
        {(product.location_name || product.country_name) && (
          <Text {...factsStyle}>
            {[product.location_name, product.country_name].filter(Boolean).join(', ')}
          </Text>
        )}
        {product.review_count > 0 && (
          <Link href={`${detailsHref}#reviews`}>
            <Flex align="center" gap="4px" color="gray.700" fontSize="sm" fontWeight="600">
              <StarIcon size={16} />
              <Text as="span">{Number(product.average_rating).toFixed(1)}</Text>
              <Text as="span" color="gray.500">
                · {formatCount(product.review_count, ['отзыв', 'отзыва', 'отзывов'])}
              </Text>
            </Flex>
          </Link>
        )}
        {product.description && (
          <Text {...descriptionStyle} title={product.description}>
            {product.description}
          </Text>
        )}
        {facts.length > 0 && <Text {...factsStyle}>{facts.join(' · ')}</Text>}
        {scheduleText && <Text {...factsStyle}>{scheduleText}</Text>}
        {scheduled && dates.length > 0 && (
          <NativeSelect.Root>
            <NativeSelect.Field
              aria-label={`Дата: ${product.name}`}
              value={date}
              {...dateSelectStyle}
              onChange={handleDateChange}
            >
              {dates.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        )}
        {unavailable && (
          <Text {...factsStyle}>
            {trip ? 'В даты поездки экскурсий нет.' : 'Ближайших экскурсий нет.'}
          </Text>
        )}
        {unscheduledTour && <Text {...factsStyle}>Дату согласуем после заказа.</Text>}
        <Stack {...footerStyle}>
          <Flex {...priceRowStyle}>
            <Text {...priceStyle}>{formatMoney(product.price, product.currency)}</Text>
            <Text {...factsStyle}>
              {product.product_type === 'goods' ? 'за штуку' : 'за участника'}
            </Text>
          </Flex>
          <CartButton
            quantity={quantity}
            max={MAX_QUANTITY}
            initialQuantity={product.product_type === 'goods' ? 1 : defaultQuantity}
            disabled={disabled || unavailable}
            onQuantityChange={handleQuantityChange}
          />
        </Stack>
      </Stack>
    </Card>
  );
};
