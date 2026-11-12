import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { CatalogLanguage } from '@/lib/api';

// Бэкенд пишет ошибки по-английски для разработчиков, поэтому клиенту объясняем по коду ответа.
export const getSaveError = (error: unknown, lang: CatalogLanguage = 'ru') => {
  const status = (error as FetchBaseQueryError | undefined)?.status;
  if (status === 400) {
    return lang === 'en'
      ? 'Check the fields: one of the values was not accepted.'
      : 'Проверьте поля: какое-то значение бэкенд не принял.';
  }
  if (status === 401) {
    return lang === 'en'
      ? 'Your session has expired. Sign in and try again.'
      : 'Сессия закончилась. Войдите снова и повторите.';
  }
  return lang === 'en'
    ? 'Could not save. Please try again.'
    : 'Не удалось сохранить. Попробуйте еще раз.';
};
