'use client';

import { Switch as ChakraSwitch } from '@chakra-ui/react';
import { forwardRef } from 'react';
import { controlStyle, labelStyle, rootStyle, thumbStyle } from './Toggle.styles';

export type ToggleProps = ChakraSwitch.RootProps;

/** Переключатель-«тумблер» с подписью рядом. */
export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { children, ...props },
  ref
) {
  return (
    <ChakraSwitch.Root unstyled {...rootStyle} {...props}>
      <ChakraSwitch.HiddenInput ref={ref} />
      <ChakraSwitch.Control {...controlStyle}>
        <ChakraSwitch.Thumb {...thumbStyle} />
      </ChakraSwitch.Control>
      {children && <ChakraSwitch.Label {...labelStyle}>{children}</ChakraSwitch.Label>}
    </ChakraSwitch.Root>
  );
});
