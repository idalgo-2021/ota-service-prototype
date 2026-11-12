import { skipToken } from '@reduxjs/toolkit/query';
import { useRouter } from 'next/navigation';
import { useGetDictionariesQuery, useGetProfileQuery, type CatalogLanguage } from '@/lib/api';
import { useAppSelector } from '@/lib/hooks';
import {
  buildProfileHref,
  getCurrentProfileReturnTo,
  type ProfileTab,
} from '@/lib/profileNavigation';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import type { SegmentedControlOption } from '@/shared/segmented-control';

export type { ProfileTab } from '@/lib/profileNavigation';

const RU_TABS: SegmentedControlOption<ProfileTab>[] = [
  { value: 'personal', label: 'Личные данные', title: 'Личные данные' },
  { value: 'settings', label: 'Настройки', title: 'Настройки: язык, валюта, параметры поиска' },
  { value: 'bookings', label: 'Брони', title: 'История броней' },
  { value: 'orders', label: 'Заказы', title: 'История заказов экскурсий и услуг' },
  { value: 'reviews', label: 'Отзывы', title: 'Мои отзывы и черновики' },
];

const EN_TABS: SegmentedControlOption<ProfileTab>[] = [
  { value: 'personal', label: 'Personal details', title: 'Personal details' },
  { value: 'settings', label: 'Settings', title: 'Language, currency and search preferences' },
  { value: 'bookings', label: 'Bookings', title: 'Booking history' },
  { value: 'orders', label: 'Orders', title: 'Order history' },
  { value: 'reviews', label: 'Reviews', title: 'My reviews and drafts' },
];

type Status = 'pending' | 'guest' | 'error' | 'loading' | 'ready';

const formatSince = (date: string, lang: CatalogLanguage) =>
  new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));

export const useController = () => {
  const router = useRouter();
  const { accessToken, email, restored } = useAppSelector((state) => state.auth);
  // Тот же ключ кэша, что и у языка каталога, чтобы профиль не запрашивался дважды.
  const profile = useGetProfileQuery(accessToken ? (email ?? 'current-user') : skipToken);
  const { lang, ready } = useCatalogLanguage();
  const dictionaries = useGetDictionariesQuery(ready ? lang : skipToken);

  const getStatus = (): Status => {
    if (!restored) {
      return 'pending';
    }
    if (!accessToken) {
      return 'guest';
    }
    if (profile.isError || dictionaries.isError) {
      return 'error';
    }
    return profile.data && dictionaries.data ? 'ready' : 'loading';
  };

  const fullName = profile.data
    ? [profile.data.first_name, profile.data.last_name].filter(Boolean).join(' ')
    : '';

  // Вкладку держим в адресе, чтобы на неё можно было сослаться и вернуться кнопкой «Назад».
  const handleTabChange = (next: ProfileTab) => {
    router.replace(buildProfileHref({ tab: next, returnTo: getCurrentProfileReturnTo() }), {
      scroll: false,
    });
  };

  return {
    status: getStatus(),
    profile: profile.data,
    dictionaries: dictionaries.data,
    lang,
    tabs: lang === 'en' ? EN_TABS : RU_TABS,
    title: fullName || profile.data?.email || (lang === 'en' ? 'Profile' : 'Профиль'),
    since: profile.data
      ? lang === 'en'
        ? `Member since ${formatSince(profile.data.created_at, lang)}`
        : `На сайте с ${formatSince(profile.data.created_at, lang)}`
      : '',
    handleTabChange,
  };
};
