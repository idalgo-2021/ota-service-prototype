'use client';

import { chakra, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppSelector } from '@/lib/hooks';
import { useGetDictionariesQuery, useGetProfileQuery } from '@/lib/api';
import { SegmentedControl, type SegmentedControlOption } from '@/shared/segmented-control';
import { Card } from '@/shared/card';
import { PersonalForm } from '../../profile/PersonalForm';
import { HotelierProfileSettings } from '../../hotelier/HotelierProfileSettings';
import { AdminLanguageProvider, translateAdmin } from '../adminLocale';
import { BookingsTable } from '../BookingsTable';
import { OrdersTable } from '../OrdersTable';
import { ResourceSection } from '../resources';
import {
  contentStyle,
  getNavLinkStyle,
  layoutStyle,
  messageStyle,
  navGroupStyle,
  navGroupTitleStyle,
  navStyle,
  rootStyle,
  sectionTitleStyle,
  sidebarStyle,
  titleStyle,
} from './AdminPage.styles';
import { useController } from './useController';

const MESSAGES = {
  guest: 'Войдите под учетной записью сотрудника, чтобы открыть админку.',
  forbidden: 'Админка доступна только менеджерам и администраторам.',
};

type AdminPageProps = {
  /** Раздел из адреса; неизвестный или недоступный роли — первый раздел. */
  tab: string;
  record?: string;
};

const AdminSectionIcon = ({ id }: { id: string }) => {
  const paths: Record<string, React.ReactNode> = {
    bookings: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 3v4m8-4v4M4 10h16m-11 4h2m-2 3h5" />
      </>
    ),
    orders: (
      <>
        <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.5L21 8H6" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </>
    ),
    listings: (
      <>
        <path d="M3 20h18M5 20V8l7-4 7 4v12M9 20v-6h6v6" />
        <path d="M9 9h.01M15 9h.01" />
      </>
    ),
    articles: (
      <>
        <path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M14 3v5h5M8 12h8M8 16h8" />
      </>
    ),
    products: (
      <>
        <path d="m4 7 8-4 8 4-8 4-8-4Z" />
        <path d="M4 7v10l8 4 8-4V7M12 11v10" />
      </>
    ),
    counterparties: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-13 5h18m-11 0v2h4v-2" />
      </>
    ),
    listing_reviews: (
      <>
        <path d="M4 4h16v13H9l-5 4V4Z" />
        <path d="m12 7 1.3 2.5 2.7.4-2 1.9.5 2.7-2.5-1.3-2.5 1.3.5-2.7-2-1.9 2.7-.4L12 7Z" />
      </>
    ),
    listing_review_summaries: (
      <>
        <path d="M4 4h16v13H9l-5 4V4Z" />
        <path d="M8 8h8M8 12h6" />
      </>
    ),
    listing_feature_tags: (
      <>
        <path d="m20 13-7 7-10-10V3h7l10 10Z" />
        <circle cx="7" cy="7" r="1" />
      </>
    ),
    product_reviews: (
      <>
        <path d="M4 4h16v13H9l-5 4V4Z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ),
    clients: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0m.5-15a3.5 3.5 0 0 1 0 6.8m2 3.2a6 6 0 0 1 3.5 5" />
      </>
    ),
    hoteliers: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m2-13a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z" />
        <path d="M19 8v6m-3-3h6" />
      </>
    ),
    countries: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18m-9-9a15 15 0 0 1 0 18m0-18a15 15 0 0 0 0 18" />
      </>
    ),
    locations: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    listing_types: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </>
    ),
    currencies: (
      <>
        <path d="M12 3v18m5-14H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6" />
      </>
    ),
    exchange_rates: (
      <>
        <path d="M4 7h15l-3-3m4 13H5l3 3" />
        <path d="M19 7v4M5 17v-4" />
      </>
    ),
  };
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[id] ?? (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8m-4-4h8" />
        </>
      )}
    </svg>
  );
};

/**
 * Рабочее место сотрудника: слева меню разделов по группам (операции, каталог, отзывы, люди,
 * справочники), справа таблица выбранного раздела с фильтрами и действиями. Менеджер видит
 * только доступные ему разделы. Гостю и клиенту показывает, почему админка недоступна.
 */
export const AdminPage = ({ tab, record }: AdminPageProps) => {
  const { access, groups, section } = useController(tab);
  const { accessToken, email } = useAppSelector((state) => state.auth);
  const profile = useGetProfileQuery(
    access === 'granted' && accessToken ? (email ?? 'current-user') : skipToken,
    {
      refetchOnMountOrArgChange: true,
    }
  );
  const lang = profile.data?.language?.toUpperCase() === 'EN' ? 'en' : 'ru';
  const dictionaries = useGetDictionariesQuery(profile.data ? lang : skipToken);
  const showProfile = tab === 'profile';
  const [profileTab, setProfileTab] = useState<'personal' | 'settings'>('personal');
  const t = (text: string) => translateAdmin(text, lang);
  const CustomSection = section.component;
  const employeeName = [profile.data?.first_name, profile.data?.last_name]
    .filter(Boolean)
    .join(' ');
  const employeeEmail = profile.data?.email ?? email;

  const renderContent = () => {
    if (access === 'pending') {
      return null;
    }
    if (access !== 'granted') {
      return <Text {...messageStyle}>{t(MESSAGES[access])}</Text>;
    }
    return (
      <Flex {...layoutStyle}>
        <Card as="aside" {...sidebarStyle}>
          <chakra.nav aria-label={t('Разделы админки')} {...navStyle}>
            {groups.map((group) => (
              <Stack key={group.title} {...navGroupStyle}>
                <Text {...navGroupTitleStyle}>{t(group.title)}</Text>
                {group.sections.map(({ value, label, href }) => (
                  <chakra.a
                    key={value}
                    asChild
                    aria-current={!showProfile && value === section.value ? 'page' : undefined}
                    {...getNavLinkStyle(!showProfile && value === section.value)}
                  >
                    <Link href={href} scroll={false}>
                      <chakra.span
                        display="inline-flex"
                        alignItems="center"
                        justifyContent="center"
                        w="22px"
                        mr="10px"
                        flexShrink={0}
                        opacity={0.85}
                      >
                        <AdminSectionIcon id={value} />
                      </chakra.span>
                      {t(label)}
                    </Link>
                  </chakra.a>
                ))}
              </Stack>
            ))}
          </chakra.nav>
        </Card>
        <Stack {...contentStyle}>
          {showProfile ? (
            profile.isLoading || !profile.data ? (
              <Text>
                {profile.isError
                  ? t('Не удалось загрузить данные. Попробуйте обновить страницу.')
                  : '…'}
              </Text>
            ) : (
              <Stack gap="16px" w="100%">
                <Heading as="h2" {...sectionTitleStyle}>
                  {t('Профиль')}
                </Heading>
                <SegmentedControl
                  options={
                    [
                      { value: 'personal', label: t('Личные данные'), title: t('Личные данные') },
                      { value: 'settings', label: t('Язык и валюта'), title: t('Язык и валюта') },
                    ] satisfies SegmentedControlOption<'personal' | 'settings'>[]
                  }
                  value={profileTab}
                  onValueChange={setProfileTab}
                />
                {profileTab === 'personal' ? (
                  <PersonalForm
                    profile={profile.data}
                    dictionaries={dictionaries.data}
                    lang={lang}
                  />
                ) : (
                  <HotelierProfileSettings
                    profile={profile.data}
                    dictionaries={dictionaries.data}
                    lang={lang}
                  />
                )}
              </Stack>
            )
          ) : (
            <>
              <Heading as="h2" {...sectionTitleStyle}>
                {t(section.title)}
              </Heading>
              {CustomSection ? (
                <CustomSection />
              ) : section.config ? (
                // Ключ по разделу: фильтры и окна одного раздела не переносятся в другой.
                <ResourceSection
                  key={`${section.value}:${record ?? ''}`}
                  config={section.config}
                  focusedId={record}
                />
              ) : section.value === 'orders' ? (
                <OrdersTable />
              ) : (
                <BookingsTable />
              )}
            </>
          )}
        </Stack>
      </Flex>
    );
  };

  return (
    <AdminLanguageProvider lang={lang}>
      <Stack as="main" {...rootStyle} lang={lang}>
        <Flex justify="space-between" align="center" gap="12px">
          <Stack gap="6px">
            <Heading as="h1" {...titleStyle}>
              {t('Админка')}
            </Heading>
            <Text color="gray.600" fontSize="14px">
              {employeeName || employeeEmail || ''}
              {employeeName && employeeEmail ? ` · ${employeeEmail}` : ''}
            </Text>
          </Stack>
        </Flex>
        {renderContent()}
      </Stack>
    </AdminLanguageProvider>
  );
};
