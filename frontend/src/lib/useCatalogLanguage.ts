import { skipToken } from '@reduxjs/toolkit/query';
import { useGetProfileQuery, type CatalogLanguage, type SavedSearchPreferences } from './api';
import { useAppSelector } from './hooks';

/** Каталог берёт язык вошедшего клиента из профиля; гостю показывает русский текст. */
export const useCatalogLanguage = (): {
  lang: CatalogLanguage;
  ready: boolean;
  preferences?: SavedSearchPreferences;
} => {
  const { accessToken, email, restored } = useAppSelector((state) => state.auth);
  const profile = useGetProfileQuery(
    restored && accessToken ? (email ?? 'current-user') : skipToken,
    {
      refetchOnMountOrArgChange: true,
    }
  );
  const ready = restored && (!accessToken || Boolean(profile.data) || profile.isError);
  return {
    lang: accessToken && profile.data?.language.toUpperCase() === 'EN' ? 'en' : 'ru',
    ready,
    preferences: accessToken ? (profile.data?.search_preferences ?? undefined) : undefined,
  };
};
