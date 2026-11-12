import type { ChangeEvent } from 'react';

export const useController = <T extends string>(onValueChange: (value: T) => void) => {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onValueChange(event.target.value as T);
  };

  return { handleChange };
};
