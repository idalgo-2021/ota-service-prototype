'use client';

import { Button as ChakraButton, type ButtonProps as ChakraButtonProps } from '@chakra-ui/react';
import { forwardRef } from 'react';
import { buttonStyle, softButtonStyle } from './Button.styles';

export type ButtonProps = ChakraButtonProps & {
  /** `soft` — светло-синяя второстепенная кнопка (например, «Выйти» или «Назад») */
  appearance?: 'primary' | 'soft';
};

/** Основная синяя кнопка (например, «Найти» на главной) или её светлый второстепенный вариант. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { appearance = 'primary', ...props },
  ref
) {
  return (
    <ChakraButton
      ref={ref}
      {...buttonStyle}
      {...(appearance === 'soft' ? softButtonStyle : undefined)}
      {...props}
    />
  );
});
