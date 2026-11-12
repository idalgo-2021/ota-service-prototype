'use client';

import { Checkbox as ChakraCheckbox } from '@chakra-ui/react';
import { forwardRef } from 'react';
import { controlStyle, indicatorStyle, labelStyle, rootStyle } from './Checkbox.styles';

export type CheckboxProps = ChakraCheckbox.RootProps;

/** Флажок с квадратной галочкой и подписью справа. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { children, ...props },
  ref
) {
  return (
    <ChakraCheckbox.Root {...rootStyle} {...props}>
      <ChakraCheckbox.HiddenInput ref={ref} />
      <ChakraCheckbox.Control {...controlStyle}>
        <ChakraCheckbox.Indicator {...indicatorStyle} />
      </ChakraCheckbox.Control>
      {children && <ChakraCheckbox.Label {...labelStyle}>{children}</ChakraCheckbox.Label>}
    </ChakraCheckbox.Root>
  );
});
