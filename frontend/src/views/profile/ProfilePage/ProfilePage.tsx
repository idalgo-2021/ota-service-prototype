'use client';

import { Heading, Stack, Text } from '@chakra-ui/react';
import { BookingsList } from '@/views/bookings';
import { OrdersList } from '@/views/marketplace';
import { ResultPlaceholder } from '@/shared/result-placeholder';
import { SegmentedControl } from '@/shared/segmented-control';
import { PersonalForm } from '../PersonalForm';
import { SettingsForm } from '../SettingsForm';
import { MyReviews } from '../MyReviews/MyReviews';
import { headerStyle, messageStyle, rootStyle, sinceStyle, titleStyle } from './ProfilePage.styles';
import { type ProfileTab, useController } from './useController';

const MESSAGES = {
  ru: {
    guest: 'Войдите через кнопку «Войти» вверху страницы, чтобы открыть профиль.',
    error: 'Не удалось загрузить профиль. Попробуйте обновить страницу.',
    profile: 'Профиль',
  },
  en: {
    guest: 'Sign in to open your profile.',
    error: 'Could not load your profile. Try refreshing the page.',
    profile: 'Profile',
  },
};

type ProfilePageProps = {
  tab: ProfileTab;
  /** Только что оформленная бронь: во вкладке броней — сообщение об успехе, её карточка выделена */
  createdBookingId?: string;
  /** Услуги из корзины, оформленные вместе с бронью: оформились или нет */
  bookingServices?: 'confirmed' | 'failed';
};

/**
 * Профиль клиента: имя (или почта) и дата регистрации, под ними вкладки —
 * личные данные, настройки, история броней и заказов, личные отзывы.
 * Выбранная вкладка хранится в адресе; после оформления брони открывается вкладка броней
 * с сообщением о результате. Гостю объясняет, что нужно войти.
 */
export const ProfilePage = ({ tab, createdBookingId, bookingServices }: ProfilePageProps) => {
  const { status, profile, dictionaries, lang, tabs, title, since, handleTabChange } =
    useController();

  const renderContent = () => {
    if (status === 'pending') {
      return null;
    }
    if (status === 'loading') {
      return <ResultPlaceholder />;
    }
    if (status !== 'ready' || !profile) {
      return (
        <Text {...messageStyle}>{MESSAGES[lang][status === 'guest' ? 'guest' : 'error']}</Text>
      );
    }
    if (tab === 'bookings') {
      return <BookingsList lang={lang} createdId={createdBookingId} services={bookingServices} />;
    }
    if (tab === 'orders') {
      return <OrdersList />;
    }
    if (tab === 'reviews') {
      return <MyReviews />;
    }
    // Формы берут значения из профиля при открытии вкладки, поэтому после сохранения
    // в одной вкладке другая покажет свежие данные.
    return tab === 'settings' ? (
      <SettingsForm
        key={profile.updated_at}
        profile={profile}
        dictionaries={dictionaries}
        lang={lang}
      />
    ) : (
      <PersonalForm
        key={profile.updated_at}
        profile={profile}
        dictionaries={dictionaries}
        lang={lang}
      />
    );
  };

  return (
    <Stack as="main" {...rootStyle}>
      <Stack {...headerStyle}>
        <Heading as="h1" {...titleStyle}>
          {status === 'ready' ? title : MESSAGES[lang].profile}
        </Heading>
        {since && <Text {...sinceStyle}>{since}</Text>}
      </Stack>
      {status === 'ready' && (
        <SegmentedControl options={tabs} value={tab} onValueChange={handleTabChange} />
      )}
      {renderContent()}
    </Stack>
  );
};
