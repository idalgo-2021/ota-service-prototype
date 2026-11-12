'use client';

import { Input as ChakraInput, type InputProps as ChakraInputProps } from '@chakra-ui/react';
import { forwardRef } from 'react';
import { inputStyle } from './Input.styles';

export type InputProps = ChakraInputProps;

/** Однострочное текстовое поле в фирменном стиле без подписи. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
  return <ChakraInput ref={ref} {...inputStyle} {...props} />;
});
