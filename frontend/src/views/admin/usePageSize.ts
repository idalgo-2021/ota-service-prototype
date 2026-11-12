'use client';

import { useSyncExternalStore } from 'react';

export const PAGE_SIZES = [20, 50, 100, 1000] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

const CHANGE_EVENT = 'admin-display-settings';

const subscribe = (notify: () => void) => {
  window.addEventListener('storage', notify);
  window.addEventListener(CHANGE_EVENT, notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener(CHANGE_EVENT, notify);
  };
};

const save = (key: string, value: string) => {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

const getPageSize = (): PageSize => {
  const stored = Number(window.localStorage.getItem('admin.pageSize'));
  return PAGE_SIZES.includes(stored as PageSize) ? (stored as PageSize) : 20;
};

export const usePageSize = () => {
  const pageSize = useSyncExternalStore<PageSize>(subscribe, getPageSize, () => 20);

  const changePageSize = (value: string) => {
    const next = Number(value);
    if (PAGE_SIZES.includes(next as PageSize)) {
      save('admin.pageSize', String(next));
    }
  };

  return { pageSize, changePageSize };
};
