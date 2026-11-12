'use client';

import { chakra, Text } from '@chakra-ui/react';
import { Button } from '../button';
import { IconButton } from '../icon-button';
import {
  addStyle,
  captionStyle,
  countStyle,
  labelStyle,
  stepperStyle,
  stepStyle,
} from './CartButton.styles';
import { useController } from './useController';

type CartButtonProps = {
  /** Сколько штук уже в корзине */
  quantity: number;
  /** Больше этого количества «+» не добавляет */
  max?: number;
  /** Сколько единиц добавить первым нажатием */
  initialQuantity?: number;
  disabled?: boolean;
  onQuantityChange: (quantity: number) => void;
};

/**
 * Кнопка корзины, как в сервисах доставки: пока товара в корзине нет — «В корзину»,
 * после добавления — счётчик «− 2 в корзине +». «−» на последней штуке убирает товар.
 */
export const CartButton = ({
  quantity,
  max = Infinity,
  initialQuantity = 1,
  disabled,
  onQuantityChange,
}: CartButtonProps) => {
  const { canIncrease, handleAdd, handleDecrease, handleIncrease } = useController(
    quantity,
    max,
    initialQuantity,
    onQuantityChange
  );

  if (quantity <= 0) {
    return (
      <Button {...addStyle} disabled={disabled} onClick={handleAdd}>
        Добавить в корзину
      </Button>
    );
  }

  return (
    <chakra.div role="group" aria-label="Количество в корзине" {...stepperStyle}>
      <IconButton
        label={quantity === 1 ? 'Убрать из корзины' : 'Убрать одну'}
        disabled={disabled}
        {...stepStyle}
        onClick={handleDecrease}
      >
        −
      </IconButton>
      <chakra.span aria-live="polite" {...labelStyle}>
        <Text as="span" {...countStyle}>
          {quantity}
        </Text>
        <Text as="span" {...captionStyle}>
          в корзине
        </Text>
      </chakra.span>
      <IconButton
        label="Добавить еще"
        disabled={disabled || !canIncrease}
        {...stepStyle}
        onClick={handleIncrease}
      >
        +
      </IconButton>
    </chakra.div>
  );
};
