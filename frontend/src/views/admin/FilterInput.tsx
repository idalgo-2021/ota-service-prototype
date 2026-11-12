'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/shared/input';
import { FilterField } from './FilterField';

export const FilterInput = ({
  label,
  type = 'text',
  value,
  onValueChange,
}: {
  label: string;
  type?: 'text' | 'number';
  value: string;
  onValueChange: (value: string) => void;
}) => {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <FilterField label={label}>
      <Input
        aria-label={label}
        type={type}
        min={type === 'number' ? 1 : undefined}
        max={type === 'number' ? 10 : undefined}
        step={type === 'number' ? 'any' : undefined}
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => onValueChange(next), 350);
        }}
      />
    </FilterField>
  );
};
