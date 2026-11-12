'use client';

import { useEffect, useRef, useState } from 'react';
import { isoToRuDigits, maskRuInput, ruDigitsToIso } from './dateUtils';
import styles from './page.module.css';

type RuDateInputProps = {
  id?: string;
  label: string;
  value: string; // ISO: YYYY-MM-DD
  min?: string; // ISO: YYYY-MM-DD
  onChange: (isoValue: string) => void;
  ariaLabel?: string;
};

function CalendarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function RuDateInput({
  id,
  label,
  value,
  min,
  onChange,
  ariaLabel,
}: RuDateInputProps) {
  const [text, setText] = useState(() => isoToRuDigits(value));
  const nativeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(isoToRuDigits(value));
  }, [value]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = maskRuInput(event.target.value, text);
    setText(next);
    if (next.length === 10) {
      const parsedIso = ruDigitsToIso(next);
      if (parsedIso) {
        onChange(parsedIso);
      }
    }
  };

  const handleBlur = () => {
    const parsedIso = ruDigitsToIso(text);
    if (parsedIso) {
      onChange(parsedIso);
      setText(isoToRuDigits(parsedIso));
    } else {
      setText(isoToRuDigits(value));
    }
  };

  const handleTriggerClick = () => {
    try {
      nativeInputRef.current?.showPicker();
    } catch {
      nativeInputRef.current?.focus();
    }
  };

  return (
    <div className={styles.dateInputContainer}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className={styles.dateTextInput}
        placeholder="ДД.ММ.ГГГГ"
        value={text}
        onChange={handleInputChange}
        onBlur={handleBlur}
        aria-label={ariaLabel || label}
      />
      <button
        type="button"
        className={styles.datePickerTrigger}
        onClick={handleTriggerClick}
        aria-label={`Выбрать ${label.toLowerCase()} в календаре`}
        title={`Выбрать ${label.toLowerCase()} в календаре`}
      >
        <CalendarIcon />
        <input
          ref={nativeInputRef}
          type="date"
          tabIndex={-1}
          min={min}
          value={value}
          onChange={(event) => {
            if (event.target.value) {
              onChange(event.target.value);
            }
          }}
          className={styles.invisibleNativeInput}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
