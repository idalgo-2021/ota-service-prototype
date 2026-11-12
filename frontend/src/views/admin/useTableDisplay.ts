'use client';

import { useSyncExternalStore } from 'react';

const EVENT = 'admin-table-display';
const subscribe = (notify: () => void) => {
  window.addEventListener(EVENT, notify);
  window.addEventListener('storage', notify);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener('storage', notify);
  };
};

const save = (key: string, value: string) => {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(EVENT));
};

export const useTableDisplay = (tableId: string) => {
  const columnsValue = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(`admin.columns.${tableId}`) ?? '',
    () => ''
  );
  const compact = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem('admin.compactTables') === 'true',
    () => false
  );
  let selected: string[] | undefined;
  try {
    const parsed = JSON.parse(columnsValue);
    if (Array.isArray(parsed)) {
      selected = parsed.filter((value): value is string => typeof value === 'string');
    }
  } catch {
    // A missing or old preference means all columns are visible.
  }
  const saveColumns = (columns: string[]) =>
    save(`admin.columns.${tableId}`, JSON.stringify(columns));
  const toggleCompact = () => save('admin.compactTables', String(!compact));
  return { selected, compact, saveColumns, toggleCompact };
};
