'use client';

import { Box, Flex, Heading, Skeleton, Stack, Text } from '@chakra-ui/react';
import { Pagination } from '@/shared/pagination';
import { SegmentedControl } from '@/shared/segmented-control';
import { SortSelect } from '@/shared/sort-select';
import { ProductCard } from '../ProductCard';
import type { Cart } from '../useCart';
import type { TripDates } from '../products';
import {
  filterStyle,
  filtersStyle,
  getGridStyle,
  messageStyle,
  rootStyle,
  skeletonStyle,
  titleStyle,
} from './Showcase.styles';
import { TYPE_OPTIONS, useController, type TypeFilter } from './useController';

const SKELETON_COUNT = 3;

type ShowcaseProps = {
  /** Город, предложения которого показываем */
  locationId?: number;
  /** Поиск по названию, описанию и локации продукта */
  query?: string;
  title?: string;
  /** Даты поездки: экскурсии предлагаем только в эти дни */
  trip?: TripDates;
  /** Корзина страницы: её показывает сама страница — рядом с витриной или в сводке поездки */
  cart: Cart;
  /** Число участников, которое сразу добавляем для экскурсий и услуг */
  defaultQuantity?: number;
  type?: TypeFilter;
  onTypeChange?: (type: TypeFilter) => void;
};

/**
 * Витрина экскурсий, услуг и товаров продавцов в городе поездки: переключатель вида
 * и сетка карточек с кнопками корзины и пагинацией. Если в городе предложений нет,
 * не показывается вовсе.
 */
export const Showcase = ({
  locationId,
  query,
  title,
  trip,
  cart,
  defaultQuantity = 1,
  type: controlledType,
  onTypeChange,
}: ShowcaseProps) => {
  const {
    hidden,
    type,
    sort,
    products,
    loading,
    refreshing,
    error,
    total,
    limit,
    offset,
    handleTypeChange,
    handleSortChange,
    handleOffsetChange,
  } = useController(locationId, query, controlledType, onTypeChange);

  if (hidden) {
    return null;
  }

  const renderProducts = () => {
    if (loading) {
      return (
        <Box {...getGridStyle(false)}>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <Skeleton key={index} {...skeletonStyle} />
          ))}
        </Box>
      );
    }
    if (error) {
      return (
        <Text {...messageStyle}>
          Не удалось загрузить предложения. Попробуйте обновить страницу.
        </Text>
      );
    }
    if (!products.length) {
      return <Text {...messageStyle}>Таких предложений здесь пока нет.</Text>;
    }
    return (
      <Box {...getGridStyle(refreshing)}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            trip={trip}
            getQuantity={cart.getQuantity}
            disabled={!cart.isSignedIn || cart.locked}
            defaultQuantity={defaultQuantity}
            onQuantityChange={cart.handleQuantityChange}
          />
        ))}
      </Box>
    );
  };

  return (
    <Stack as="section" {...rootStyle}>
      {title && (
        <Heading as="h2" {...titleStyle}>
          {title}
        </Heading>
      )}
      <Stack {...filtersStyle}>
        <Box {...filterStyle}>
          <SegmentedControl options={TYPE_OPTIONS} value={type} onValueChange={handleTypeChange} />
        </Box>
        <Flex gap="8px" flexWrap="wrap">
          <SortSelect
            by="price"
            value={sort?.price}
            onChange={(price) => handleSortChange({ ...(sort ?? {}), price })}
          />
          <SortSelect
            by="rating"
            value={sort?.rating}
            onChange={(rating) => handleSortChange({ ...(sort ?? {}), rating })}
          />
        </Flex>
      </Stack>
      {renderProducts()}
      {total > limit && (
        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          onOffsetChange={handleOffsetChange}
        />
      )}
    </Stack>
  );
};
