import { useEffect, useRef } from 'react';
import { formatIsoDate } from '../utils';

type UseControllerParams = {
  /** Дата в формате YYYY-MM-DD */
  value?: string;
  locale: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value?: string) => void;
};

export const useController = ({
  value,
  locale,
  open,
  onOpenChange,
  onChange,
}: UseControllerParams) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  const displayValue = value ? formatIsoDate(value, { locale }) : undefined;

  const handleSelect = (iso: string) => {
    onChange(iso);
    onOpenChange(false);
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenChange(!open);
    }
  };

  const handleToggleOpen = () => {
    onOpenChange(!open);
  };

  return {
    handleToggleOpen,
    containerRef,
    displayValue,
    handleSelect,
    handleTriggerKeyDown,
  };
};
