'use client';

import { Flex } from '@chakra-ui/react';
import { Range } from '@/shared/range';
import { Section } from '@/shared/section';
import { rangeLabelsStyle } from './PriceFilter.styles';
import { useController } from './useController';

/** Секция «Цена»: двойной ползунок диапазона цены за ночь
 * и подписи минимума и максимума под ним. */
export const PriceFilter = () => {
  const { price, handlePriceChange, priceMin, priceMax, formatPrice } = useController();

  return (
    <Section title="Цена">
      <Range
        min={priceMin}
        max={priceMax}
        step={100}
        value={price}
        onValueChange={handlePriceChange}
      />
      <Flex {...rangeLabelsStyle}>
        <span>{formatPrice(price[0])}</span>
        <span>{formatPrice(price[1])}</span>
      </Flex>
    </Section>
  );
};
