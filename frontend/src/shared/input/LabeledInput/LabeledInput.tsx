'use client';

import { Box, Input as ChakraInput, type InputProps as ChakraInputProps } from '@chakra-ui/react';
import { forwardRef } from 'react';
import { CloseIcon } from '../../icons';
import { IconButton } from '../../icon-button';
import { InputLabel } from '../../input-label';
import { clearButtonStyle, containerStyle, getInputStyle } from './LabeledInput.styles';
import { useController } from './useController';

export type LabeledInputProps = ChakraInputProps & {
  label: string;
  clearLabel?: string;
  onClear?: () => void;
};

/**
 * Текстовое поле с подписью внутри сверху («Направление»); если передан `onClear` и поле
 * не пустое, справа появляется крестик очистки.
 */
export const LabeledInput = forwardRef<HTMLInputElement, LabeledInputProps>(function LabeledInput(
  { label, clearLabel = 'Очистить поле', id, onClear, ...props },
  ref
) {
  const { innerRef, showClear, handleClear } = useController(onClear, props.value, ref);

  return (
    <Box {...containerStyle}>
      <InputLabel htmlFor={id} label={label} />

      <ChakraInput ref={innerRef} id={id} {...getInputStyle(showClear)} {...props} />
      {showClear && (
        <IconButton label={clearLabel} {...clearButtonStyle} onClick={handleClear}>
          <CloseIcon size={20} />
        </IconButton>
      )}
    </Box>
  );
});
