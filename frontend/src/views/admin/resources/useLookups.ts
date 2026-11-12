import { useMemo } from 'react';
import { useGetAdminPageQuery } from '@/lib/adminApi';
import { useGetDictionariesQuery } from '@/lib/api';
import { useAdminLanguage } from '../adminLocale';
import type { LookupKind, Lookups, Option } from './types';

/** Контрагентов немного, поэтому для выпадающих списков берём одну страницу по максимуму бэкенда. */
const COUNTERPARTIES_LIMIT = 100;

/**
 * Справочники для форм и таблиц админки. Страны, города, типы жилья и валюты берём из
 * публичного словаря: служебные списки справочников доступны только администратору,
 * а выбирать город в форме нужно и менеджеру.
 */
export const useLookups = (): Lookups => {
  const lang = useAdminLanguage();
  const dictionaries = useGetDictionariesQuery(lang);
  const counterparties = useGetAdminPageQuery({
    path: '/admin/counterparties',
    params: { limit: COUNTERPARTIES_LIMIT },
  });
  const listingFeatureTags = useGetAdminPageQuery({
    path: '/admin/listing-feature-tags',
    params: { limit: COUNTERPARTIES_LIMIT },
  });

  return useMemo(() => {
    const data = dictionaries.data;
    const lists: Record<LookupKind, Option[]> = {
      countries: (data?.countries ?? []).map(({ id, name }) => ({
        value: String(id),
        label: name,
      })),
      locations: (data?.locations ?? []).map(({ id, name }) => ({
        value: String(id),
        label: name,
      })),
      listingTypes: (data?.listing_types ?? []).map(({ id, name }) => ({
        value: String(id),
        label: name,
      })),
      currencies: (data?.currencies ?? []).map(({ code, name }) => ({
        value: code,
        label: `${code} — ${name}`,
      })),
      counterparties: (counterparties.data?.items ?? []).map((item) => ({
        value: String(item.id),
        label: String(item.name),
      })),
      listingFeatureTags: (listingFeatureTags.data?.items ?? []).map((item) => ({
        value: String(item.id),
        label: `${lang === 'ru' ? String(item.name_ru ?? item.name) : String(item.name)}${item.is_active === false ? ` (${lang === 'ru' ? 'выключен' : 'inactive'})` : ''}`,
      })),
    };
    const labels = Object.fromEntries(
      Object.entries(lists).map(([kind, options]) => [
        kind,
        new Map(options.map((option) => [option.value, option.label])),
      ])
    ) as Record<LookupKind, Map<string, string>>;

    return {
      ...lists,
      language: lang,
      label: (kind, id) =>
        id === null || id === undefined ? undefined : labels[kind].get(String(id)),
    };
  }, [dictionaries.data, counterparties.data, listingFeatureTags.data, lang]);
};
