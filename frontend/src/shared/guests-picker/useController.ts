import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Guests } from '@/lib/api';

export const useController = (value: Guests, onValueChange: (value: Guests) => void) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleToggleOpen = () => {
    setOpen((prev) => !prev);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen((prev) => !prev);
    }
  };

  const handleAdultsChange = (adults: number) => {
    onValueChange({ ...value, adults });
  };
  const handleChildrenChange = (children: number) => {
    onValueChange({ ...value, children });
  };
  const handlePetsChange = ({ checked }: { checked: boolean | 'indeterminate' }) => {
    onValueChange({ ...value, pets: checked === true });
  };

  return {
    rootRef,
    open,
    handleToggleOpen,
    handleTriggerKeyDown,
    handleAdultsChange,
    handleChildrenChange,
    handlePetsChange,
  };
};
