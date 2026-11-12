import type { KeyboardEvent } from 'react';

export type DateFieldTriggerProps = {
  id?: string;
  /** Выбранная дата в человекочитаемом виде */
  displayValue?: string;
  placeholder?: string;
  onToggleOpen: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
};
