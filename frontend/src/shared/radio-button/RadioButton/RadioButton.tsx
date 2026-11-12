'use client';

import { RadioGroup as ChakraRadioGroup } from '@chakra-ui/react';
import { forwardRef } from 'react';
import { controlStyle, itemStyle, textStyle } from './RadioButton.styles';

export interface RadioButtonProps extends ChakraRadioGroup.ItemProps {
  value: string;
}

/** Круглая радиокнопка с подписью справа; используется внутри группы радиокнопок. */
export const RadioButton = forwardRef<HTMLInputElement, RadioButtonProps>(function RadioButton(
  { children, ...props },
  ref
) {
  return (
    <ChakraRadioGroup.Item {...itemStyle} {...props}>
      <ChakraRadioGroup.ItemHiddenInput ref={ref} />
      <ChakraRadioGroup.ItemControl {...controlStyle} />
      {children && <ChakraRadioGroup.ItemText {...textStyle}>{children}</ChakraRadioGroup.ItemText>}
    </ChakraRadioGroup.Item>
  );
});
