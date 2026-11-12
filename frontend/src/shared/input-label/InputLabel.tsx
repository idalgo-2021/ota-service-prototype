'use client';

import { chakra } from '@chakra-ui/react';
import { labelStyle } from './InputLabel.styles';

type InputLabelProps = {
  label?: string;
  htmlFor?: string;
};

/**
 * Мелкая серая подпись, наложенная на левый верхний угол поля ввода.
 */
export const InputLabel = ({ label, htmlFor }: InputLabelProps) => {
  if (!label) {
    return null;
  }

  return (
    <chakra.label htmlFor={htmlFor} {...labelStyle}>
      {label}
    </chakra.label>
  );
};
