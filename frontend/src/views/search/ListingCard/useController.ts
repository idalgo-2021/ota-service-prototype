import { useEffect, useRef, type KeyboardEvent } from 'react';

export const useController = (selected: boolean, onSelect?: () => void) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Карточку, выбранную на карте, прокручиваем в видимую часть списка.
  useEffect(() => {
    if (selected) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selected]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onSelect?.();
    }
  };

  return { cardRef, handleKeyDown };
};
