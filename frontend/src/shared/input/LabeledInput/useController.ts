import { useRef, useImperativeHandle, type ForwardedRef } from 'react';

export const useController = (
  onClear: (() => void) | undefined,
  value: unknown,
  ref: ForwardedRef<HTMLInputElement>
) => {
  const innerRef = useRef<HTMLInputElement | null>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLInputElement, []);
  const showClear = !!onClear && !!value;

  const handleClear = () => {
    onClear?.();
    innerRef.current?.focus();
  };

  return { innerRef, showClear, handleClear };
};
