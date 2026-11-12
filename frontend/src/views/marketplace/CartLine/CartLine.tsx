'use client';

import { chakra, Flex, Image, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import type { CartItem, CartItemKey } from '../useCart';
import {
  dateStyle,
  footStyle,
  headStyle,
  nameStyle,
  pictureStyle,
  productStyle,
  priceStyle,
  quantityStyle,
  removeStyle,
  rootStyle,
  stepButtonStyle,
  stepperStyle,
} from './CartLine.styles';
import { useController } from './useController';

type CartLineProps = {
  item: CartItem;
  /** Заказ оформляется — кнопки неактивны */
  disabled: boolean;
  onQuantityChange: (item: CartItemKey, quantity: number) => void;
};

/** Позиция корзины: название и дата, количество с кнопками «−» и «+», цена и «Убрать». */
export const CartLine = ({ item, disabled, onQuantityChange }: CartLineProps) => {
  const {
    name,
    date,
    price,
    thumbnail,
    productHref,
    canIncrease,
    handleDecrease,
    handleIncrease,
    handleRemove,
  } = useController(item, onQuantityChange);

  return (
    <Stack {...rootStyle}>
      <Flex {...headStyle}>
        <Link href={productHref} style={productStyle}>
          {thumbnail ? (
            <Image src={thumbnail} alt="" {...pictureStyle} />
          ) : (
            <chakra.span {...pictureStyle} />
          )}
          <Stack gap="0" minW="0">
            <Text {...nameStyle}>{name}</Text>
            {date && <Text {...dateStyle}>{date}</Text>}
          </Stack>
        </Link>
        <chakra.button type="button" disabled={disabled} {...removeStyle} onClick={handleRemove}>
          Убрать
        </chakra.button>
      </Flex>
      <Flex {...footStyle}>
        <Flex {...stepperStyle}>
          <chakra.button
            type="button"
            aria-label="Меньше"
            disabled={disabled}
            {...stepButtonStyle}
            onClick={handleDecrease}
          >
            −
          </chakra.button>
          <Text {...quantityStyle}>{item.quantity}</Text>
          <chakra.button
            type="button"
            aria-label="Больше"
            disabled={disabled || !canIncrease}
            {...stepButtonStyle}
            onClick={handleIncrease}
          >
            +
          </chakra.button>
        </Flex>
        {price && <Text {...priceStyle}>{price}</Text>}
      </Flex>
    </Stack>
  );
};
