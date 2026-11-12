'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { useAppSelector } from '@/lib/hooks';
import { getRole } from '@/lib/auth';
import {
  useGetDictionariesQuery,
  useGetHotelierListingsQuery,
  useGetHotelierMessagesQuery,
  useGetProfileQuery,
  useSetHotelierListingActiveMutation,
  type HotelierListing,
} from '@/lib/api';
import { Button } from '@/shared/button';
import { ResultPlaceholder } from '@/shared/result-placeholder';
import { SegmentedControl, type SegmentedControlOption } from '@/shared/segmented-control';
import { Box, Flex, Heading, Image, Stack, Table, Text, chakra } from '@chakra-ui/react';
import { PersonalForm } from '../profile/PersonalForm';
import { HotelierBookings } from './HotelierBookings';
import { HotelierInventory } from './HotelierInventory';
import { HotelierMessages } from './HotelierMessages';
import { HotelierProfileSettings } from './HotelierProfileSettings';
import { HotelierReviews } from './HotelierReviews';
import { HotelierTable, HotelierTableAction } from './HotelierTable';
import {
  HotelierListingEditDialog,
  type HotelierListingDialogTab,
} from './HotelierListingEditDialog';
import { HotelierListingCreateDialog } from './HotelierListingCreateDialog';
import { IconButton } from '@/shared/icon-button/IconButton';

export type HotelierTab =
  'bookings' | 'reviews' | 'inventory' | 'messages' | 'listings' | 'profile';
type HotelierMainTab = Exclude<HotelierTab, 'profile'>;
type HotelierProfileTab = 'personal' | 'settings';

const formatDate = (value: string | null | undefined, lang: 'ru' | 'en') =>
  value ? new Date(value).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ru-RU') : '—';

const TABS: { id: HotelierMainTab; label: { ru: string; en: string } }[] = [
  { id: 'listings', label: { ru: 'Мои объекты', en: 'My properties' } },
  { id: 'inventory', label: { ru: 'Фонды', en: 'Units' } },
  { id: 'bookings', label: { ru: 'Брони', en: 'Bookings' } },
  { id: 'reviews', label: { ru: 'Отзывы', en: 'Reviews' } },
  { id: 'messages', label: { ru: 'Вопросы и уведомления', en: 'Q&A and Inbox' } },
];

const MOBILE_TAB_LABELS: Record<HotelierMainTab, { ru: string; en: string }> = {
  listings: { ru: 'Объекты', en: 'Places' },
  inventory: { ru: 'Фонды', en: 'Units' },
  bookings: { ru: 'Брони', en: 'Bookings' },
  reviews: { ru: 'Отзывы', en: 'Reviews' },
  messages: { ru: 'Вопросы', en: 'Inbox' },
};

const HotelierTabIcon = ({ id }: { id: HotelierMainTab }) => {
  const paths = {
    listings: (
      <>
        <path d="M3.5 20.5h17M5.5 20.5V7.5l6.5-4 6.5 4v13M9 20.5v-6h6v6M9 9.5h.01M15 9.5h.01" />
      </>
    ),
    inventory: (
      <>
        <rect x="3.5" y="10" width="17" height="8.5" rx="2" />
        <path d="M5.5 10V7.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2V10M3.5 18.5v2M20.5 18.5v2M3.5 14h17" />
      </>
    ),
    bookings: (
      <>
        <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
        <path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17m-12 4h3m-3 3h6" />
      </>
    ),
    reviews: (
      <>
        <path d="M5.5 4.5h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8l-5 3v-3a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" />
        <path d="m12 8 1 2.2 2.4.3-1.7 1.7.4 2.4-2.1-1.1-2.1 1.1.4-2.4-1.7-1.7 2.4-.3L12 8Z" />
      </>
    ),
    messages: (
      <>
        <path d="M5 4.5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
  };
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[id]}
    </svg>
  );
};

export const HotelierPage = ({ tab }: { tab: HotelierTab }) => {
  const router = useRouter();
  const { accessToken, email, restored } = useAppSelector((state) => state.auth);
  const isHotelier = getRole(accessToken) === 'hotelier';
  const listings = useGetHotelierListingsQuery(isHotelier ? undefined : skipToken);
  const profile = useGetProfileQuery(isHotelier ? (email ?? 'current-user') : skipToken, {
    refetchOnMountOrArgChange: true,
  });
  const lang = profile.data?.language?.toUpperCase() === 'EN' ? 'en' : 'ru';
  const dictionaries = useGetDictionariesQuery(profile.data ? lang : skipToken);
  const [profileTab, setProfileTab] = useState<HotelierProfileTab>('personal');
  const [editingListing, setEditingListing] = useState<{
    listing: HotelierListing;
    initialTab?: HotelierListingDialogTab;
  } | null>(null);
  const [creatingListing, setCreatingListing] = useState(false);
  const [statusToast, setStatusToast] = useState<{ message: string } | null>(null);
  const [setListingActive, listingActiveState] = useSetHotelierListingActiveMutation();
  const t = (ru: string, en: string) => (lang === 'en' ? en : ru);
  const toggleListingActive = async (listing: HotelierListing) => {
    const isActive = !listing.is_active;
    listingActiveState.reset();
    const result = await setListingActive({ listingId: listing.id, isActive });
    if ('data' in result) {
      const title = lang === 'en' ? listing.title : listing.title_ru || listing.title;
      setStatusToast({
        message: t(
          `Статус объекта «${title}» изменён: ${isActive ? 'активен' : 'неактивен'}.`,
          `“${title}” is now ${isActive ? 'active' : 'inactive'}.`
        ),
      });
    }
  };
  useEffect(() => {
    if (!statusToast) {
      return;
    }
    const timeout = window.setTimeout(() => setStatusToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [statusToast]);
  const unreadMessages = useGetHotelierMessagesQuery(
    isHotelier ? { limit: 1, offset: 0, status: 'new' } : skipToken,
    { pollingInterval: 60_000 }
  );

  if (!restored) {
    return null;
  }
  if (!isHotelier) {
    return (
      <Stack as="main" maxW="1280px" w="100%" mx="auto" p="20px" gap="12px">
        <Heading as="h1" fontSize="26px">
          {lang === 'en' ? 'Hotelier dashboard' : 'Кабинет отельера'}
        </Heading>
        <Text color="fg.muted">
          {accessToken
            ? lang === 'en'
              ? 'This section is available to hoteliers only.'
              : 'Этот раздел доступен только отельерам.'
            : lang === 'en'
              ? 'Sign in with a hotelier account to open the dashboard.'
              : 'Войдите под учетной записью отельера, чтобы открыть кабинет.'}
        </Text>
      </Stack>
    );
  }

  if (listings.isLoading || profile.isLoading) {
    return <ResultPlaceholder />;
  }
  if (listings.isError || profile.isError || !profile.data) {
    return (
      <Stack as="main" maxW="1280px" w="100%" mx="auto" p="20px" gap="12px">
        <Heading as="h1" fontSize="26px">
          {lang === 'en' ? 'Hotelier dashboard' : 'Кабинет отельера'}
        </Heading>
        <Text role="alert" color="red.600">
          {lang === 'en'
            ? 'Could not load dashboard data. Please refresh the page.'
            : 'Не удалось загрузить данные кабинета. Попробуйте обновить страницу.'}
        </Text>
      </Stack>
    );
  }

  const assignedListings = listings.data ?? [];
  const name = [profile.data?.first_name, profile.data?.last_name].filter(Boolean).join(' ');
  const titleFor = (id: string) => {
    const listing = assignedListings.find((item) => item.id === id);
    return (lang === 'en' ? listing?.title : listing?.title_ru || listing?.title) || id;
  };
  const showNoListings = assignedListings.length === 0 && tab !== 'listings' && tab !== 'profile';
  const profileTabs: SegmentedControlOption<HotelierProfileTab>[] =
    lang === 'en'
      ? [
          { value: 'personal', label: 'Personal details', title: 'Personal details' },
          { value: 'settings', label: 'Language and currency', title: 'Language and currency' },
        ]
      : [
          { value: 'personal', label: 'Личные данные', title: 'Личные данные' },
          { value: 'settings', label: 'Язык и валюта', title: 'Язык и валюта' },
        ];

  return (
    <Stack
      as="main"
      lang={lang}
      maxW="1520px"
      w="100%"
      mx="auto"
      minH="100dvh"
      p={{ base: '18px', md: '28px', xl: '36px' }}
      pb={{ base: 'calc(104px + env(safe-area-inset-bottom))', lg: '36px' }}
      gap={{ base: '24px', md: '30px' }}
      bg="#f5f5f7"
    >
      <Flex
        justify="space-between"
        align={{ base: 'flex-start', sm: 'center' }}
        gap="16px"
        wrap="wrap"
        pb={{ base: '4px', md: '8px' }}
      >
        <Stack gap="6px">
          <Heading
            as="h1"
            fontSize={{ base: '28px', md: '32px' }}
            letterSpacing="-0.035em"
            lineHeight="1.1"
          >
            {t('Кабинет отельера', 'Hotelier dashboard')}
          </Heading>
          <Text color="gray.600" fontSize="14px">
            {name || profile.data.email || (lang === 'en' ? 'Hotelier' : 'Отельер')}
            {name && profile.data.email ? ` · ${profile.data.email}` : ''}
          </Text>
        </Stack>
      </Flex>

      <Flex
        align="flex-start"
        gap={{ base: '14px', lg: '24px' }}
        direction={{ base: 'column', lg: 'row' }}
      >
        <Stack
          as="nav"
          aria-label={t('Разделы кабинета', 'Dashboard sections')}
          display={{ base: 'none', lg: 'flex' }}
          gap="4px"
          w={{ base: '100%', lg: '248px' }}
          flexShrink={0}
          p="8px"
          border="1px solid"
          borderColor="#e5e5ea"
          borderRadius="16px"
          bg="white"
          alignSelf="flex-start"
          position={{ lg: 'sticky' }}
          top={{ lg: '24px' }}
        >
          {TABS.map((item) => (
            <Button
              key={item.id}
              type="button"
              appearance="soft"
              justifyContent="flex-start"
              w="100%"
              minH="44px"
              px="12px"
              borderRadius="10px"
              bg={tab === item.id ? '#eaf2ff' : 'transparent'}
              color={tab === item.id ? '#0757c7' : '#3a3a3c'}
              fontWeight={tab === item.id ? '600' : '500'}
              _hover={{ bg: tab === item.id ? '#eaf2ff' : '#f5f5f7' }}
              textAlign="left"
              onClick={() => router.replace(`/hotelier?tab=${item.id}`, { scroll: false })}
            >
              <Flex as="span" w="100%" align="center" justify="space-between" gap="8px">
                <Flex as="span" align="center" gap="11px" minW="0">
                  <Box
                    color={tab === item.id ? '#0757c7' : '#6e6e73'}
                    lineHeight="0"
                    flexShrink="0"
                  >
                    <HotelierTabIcon id={item.id} />
                  </Box>
                  <span style={{ flex: 1, minWidth: 0, lineHeight: 1.15, whiteSpace: 'pre-line' }}>
                    {item.id === 'messages' && lang === 'ru'
                      ? 'Вопросы и\nуведомления'
                      : item.label[lang]}
                  </span>
                </Flex>
                {item.id === 'messages' && (unreadMessages.data?.meta.total ?? 0) > 0 && (
                  <Box
                    as="span"
                    minW="22px"
                    h="22px"
                    px="6px"
                    borderRadius="full"
                    bg={tab === 'messages' ? '#0757c7' : '#e5484d'}
                    color="white"
                    fontSize="12px"
                    lineHeight="22px"
                    textAlign="center"
                  >
                    {(unreadMessages.data?.meta.total ?? 0) > 99
                      ? '99+'
                      : unreadMessages.data?.meta.total}
                  </Box>
                )}
              </Flex>
            </Button>
          ))}
        </Stack>

        <Box flex="1" minW="0" w="100%" pt={{ lg: '2px' }}>
          {showNoListings ? (
            <Stack p="24px" border="1px solid" borderColor="gray.200" borderRadius="14px" gap="8px">
              <Text fontWeight="600">
                {t('Пока нет привязанных объектов', 'No properties assigned yet')}
              </Text>
              <Text fontSize="14px" color="fg.muted">
                {t(
                  'Попросите сотрудника или администратора назначить вам объекты размещения.',
                  'Ask a staff member or administrator to assign properties to you.'
                )}
              </Text>
            </Stack>
          ) : tab === 'profile' ? (
            <Stack gap="14px">
              <Heading as="h2" fontSize="20px">
                {t('Профиль', 'Profile')}
              </Heading>
              <SegmentedControl
                options={profileTabs}
                value={profileTab}
                onValueChange={setProfileTab}
              />
              {profileTab === 'personal' ? (
                <PersonalForm profile={profile.data} dictionaries={dictionaries.data} lang={lang} />
              ) : (
                <HotelierProfileSettings
                  profile={profile.data}
                  dictionaries={dictionaries.data}
                  lang={lang}
                />
              )}
            </Stack>
          ) : tab === 'listings' ? (
            <Stack gap="14px">
              <Flex align="center" justify="space-between" gap="12px" wrap="wrap">
                <Heading as="h2" fontSize="20px">
                  {t('Мои объекты', 'My properties')}
                </Heading>
                <Flex align="center" gap="6px">
                  <IconButton
                    label={t('Обновить список объектов', 'Refresh properties')}
                    display="inline-flex"
                    alignItems="center"
                    justifyContent="center"
                    lineHeight="0"
                    p="0"
                    w="34px"
                    h="34px"
                    borderRadius="8px"
                    border="1px solid"
                    borderColor="gray.200"
                    color="gray.700"
                    _hover={{ bg: 'gray.50' }}
                    disabled={listings.isFetching}
                    onClick={() => void listings.refetch()}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 7v5h-5M4.5 11a7.5 7.5 0 0 1 13-4L20 12M4 17v-5h5m10.5 1a7.5 7.5 0 0 1-13 4L4 12" />
                    </svg>
                  </IconButton>
                  <Button
                    type="button"
                    size="sm"
                    minH="34px"
                    h="34px"
                    px="10px"
                    fontSize="12px"
                    disabled={!dictionaries.data}
                    onClick={() => setCreatingListing(true)}
                  >
                    {t('Добавить объект', 'Add property')}
                  </Button>
                </Flex>
              </Flex>
              {listingActiveState.isError && (
                <Text role="alert" color="red.600" fontSize="14px">
                  {t(
                    'Не удалось изменить статус объекта. Попробуйте ещё раз.',
                    'Could not update the property status. Please try again.'
                  )}
                </Text>
              )}
              {assignedListings.length === 0 ? (
                <Stack
                  p="24px"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="14px"
                  gap="8px"
                >
                  <Text fontWeight="600">
                    {t('Пока нет привязанных объектов', 'No properties assigned yet')}
                  </Text>
                  <Text fontSize="14px" color="fg.muted">
                    {t(
                      'Список обновится, когда сотрудник или администратор назначит вам объект.',
                      'This list will update when a staff member or administrator assigns a property to you.'
                    )}
                  </Text>
                </Stack>
              ) : (
                <>
                  <Stack gap="10px" display={{ base: 'flex', lg: 'none' }}>
                    {assignedListings.map((listing) => {
                      const listingTitle =
                        lang === 'en'
                          ? listing.title || listing.title_ru
                          : listing.title_ru || listing.title;
                      const listingType =
                        lang === 'en'
                          ? listing.listing_type_name
                          : listing.listing_type_name_ru || listing.listing_type_name;
                      const listingAddress =
                        lang === 'en'
                          ? listing.address || listing.address_ru || '—'
                          : listing.address_ru || listing.address || '—';
                      return (
                        <Box
                          key={listing.id}
                          p="14px"
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="12px"
                          bg="white"
                          minW="0"
                        >
                          <Flex gap="12px" align="flex-start">
                            <Link
                              href={`/listings/${encodeURIComponent(listing.id)}`}
                              aria-label={`${t('Открыть объект', 'Open property')} ${listingTitle}`}
                            >
                              {listing.main_picture ? (
                                <Image
                                  src={listing.main_picture}
                                  alt=""
                                  w="72px"
                                  h="72px"
                                  objectFit="cover"
                                  borderRadius="8px"
                                  flexShrink="0"
                                />
                              ) : (
                                <Box w="72px" h="72px" bg="gray.100" borderRadius="8px" />
                              )}
                            </Link>
                            <Stack gap="3px" flex="1" minW="0">
                              <Link href={`/listings/${encodeURIComponent(listing.id)}`}>
                                <Text
                                  fontSize="16px"
                                  fontWeight="600"
                                  color="blue.700"
                                  lineHeight="1.3"
                                  overflowWrap="anywhere"
                                >
                                  {listingTitle}
                                </Text>
                              </Link>
                              <Text fontSize="13px" color="fg.muted" overflowWrap="anywhere">
                                {listingType}
                              </Text>
                              <Box
                                as="span"
                                alignSelf="flex-start"
                                px="8px"
                                py="2px"
                                borderRadius="full"
                                bg={listing.is_active ? 'green.50' : 'gray.100'}
                                color={listing.is_active ? 'green.700' : 'gray.700'}
                                fontSize="11px"
                                fontWeight="600"
                              >
                                {listing.is_active
                                  ? t('Активен', 'Active')
                                  : t('Неактивен', 'Inactive')}
                              </Box>
                            </Stack>
                          </Flex>
                          <Text mt="10px" fontSize="14px" color="gray.700" overflowWrap="anywhere">
                            {listingAddress}
                          </Text>
                          <Flex
                            mt="10px"
                            pt="10px"
                            borderTop="1px solid"
                            borderColor="gray.100"
                            gap="16px"
                            wrap="wrap"
                          >
                            <Text fontSize="13px" color="fg.muted">
                              {t('Рейтинг', 'Rating')}:{' '}
                              <Box as="span" color="gray.900" fontWeight="600">
                                {listing.average_overall_rating ?? '—'}
                              </Box>
                            </Text>
                            <Text fontSize="13px" color="fg.muted">
                              {t('Отзывы', 'Reviews')}:{' '}
                              <Box as="span" color="gray.900" fontWeight="600">
                                {listing.published_review_count}
                              </Box>
                            </Text>
                            <Text fontSize="13px" color="fg.muted">
                              {t('Ролики', 'Videos')}:{' '}
                              <Box as="span" color="gray.900" fontWeight="600">
                                {listing.video_count ?? 0}
                              </Box>
                            </Text>
                          </Flex>
                          <Flex mt="12px" gap="8px" wrap="wrap">
                            <Button
                              type="button"
                              appearance="soft"
                              h="38px"
                              minH="38px"
                              flex="1"
                              fontSize="13px"
                              onClick={() => setEditingListing({ listing, initialTab: 'details' })}
                            >
                              {t('Изменить', 'Edit')}
                            </Button>
                            <Button
                              type="button"
                              appearance="soft"
                              h="38px"
                              minH="38px"
                              flex="1"
                              fontSize="13px"
                              onClick={() => setEditingListing({ listing, initialTab: 'videos' })}
                            >
                              {t('Видео', 'Videos')}
                            </Button>
                            <Button
                              type="button"
                              appearance="soft"
                              h="38px"
                              minH="38px"
                              flex="1"
                              fontSize="13px"
                              color={listing.is_active ? 'red.700' : 'green.700'}
                              disabled={listingActiveState.isLoading}
                              onClick={() => void toggleListingActive(listing)}
                            >
                              {listing.is_active
                                ? t('Деактивировать', 'Deactivate')
                                : t('Активировать', 'Activate')}
                            </Button>
                          </Flex>
                        </Box>
                      );
                    })}
                  </Stack>
                  <Box display={{ base: 'none', lg: 'block' }}>
                    <HotelierTable minW="100%" compact>
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader w="84px">{t('Фото', 'Photo')}</Table.ColumnHeader>
                          <Table.ColumnHeader w="150px">
                            {t('Объект', 'Property')}
                          </Table.ColumnHeader>
                          <Table.ColumnHeader w="95px">
                            {t('Тип объекта', 'Property type')}
                          </Table.ColumnHeader>
                          <Table.ColumnHeader w="125px">{t('Адрес', 'Address')}</Table.ColumnHeader>
                          <Table.ColumnHeader w="95px">
                            {t('Локация', 'Location')}
                          </Table.ColumnHeader>
                          <Table.ColumnHeader w="70px">{t('Заезд', 'Check-in')}</Table.ColumnHeader>
                          <Table.ColumnHeader w="60px">
                            {t('Общий рейтинг', 'Overall rating')}
                          </Table.ColumnHeader>
                          <Table.ColumnHeader w="70px">
                            {t('Опубликованные отзывы', 'Published reviews')}
                          </Table.ColumnHeader>
                          <Table.ColumnHeader w="75px">
                            {t('Ролики', 'Videos')}
                          </Table.ColumnHeader>
                          <Table.ColumnHeader w="80px">{t('Статус', 'Status')}</Table.ColumnHeader>
                          <Table.ColumnHeader w="90px">{t('Создан', 'Created')}</Table.ColumnHeader>
                          <Table.ColumnHeader w="145px">
                            {t('Действия', 'Actions')}
                          </Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {assignedListings.map((listing) => {
                          const href = `/listings/${encodeURIComponent(listing.id)}`;
                          return (
                            <Table.Row key={listing.id}>
                              <Table.Cell>
                                <Link
                                  href={href}
                                  aria-label={`${t('Открыть объект', 'Open property')} ${listing.title_ru || listing.title}`}
                                >
                                  {listing.main_picture ? (
                                    <Image
                                      src={listing.main_picture}
                                      alt={listing.title_ru || listing.title}
                                      w="64px"
                                      h="48px"
                                      objectFit="cover"
                                      borderRadius="8px"
                                    />
                                  ) : (
                                    <Box w="64px" h="48px" bg="gray.100" borderRadius="8px" />
                                  )}
                                </Link>
                              </Table.Cell>
                              <Table.Cell>
                                <Link href={href}>
                                  <Text
                                    fontWeight="600"
                                    color="blue.700"
                                    _hover={{ textDecoration: 'underline' }}
                                  >
                                    {lang === 'en'
                                      ? listing.title || listing.title_ru
                                      : listing.title_ru || listing.title}
                                  </Text>
                                </Link>
                                <Text mt="3px" fontSize="12px" color="fg.muted">
                                  ID: {listing.id}
                                </Text>
                              </Table.Cell>
                              <Table.Cell>
                                {lang === 'en'
                                  ? listing.listing_type_name
                                  : listing.listing_type_name_ru || listing.listing_type_name}
                              </Table.Cell>
                              <Table.Cell>
                                {lang === 'en'
                                  ? listing.address || listing.address_ru || '—'
                                  : listing.address_ru || listing.address || '—'}
                              </Table.Cell>
                              <Table.Cell>
                                {lang === 'en'
                                  ? listing.location_name || listing.location_name_ru || '—'
                                  : listing.location_name_ru || listing.location_name || '—'}
                              </Table.Cell>
                              <Table.Cell>{listing.check_in_time?.slice(0, 5) || '—'}</Table.Cell>
                              <Table.Cell>{listing.average_overall_rating ?? '—'}</Table.Cell>
                              <Table.Cell>{listing.published_review_count}</Table.Cell>
                              <Table.Cell>
                                <chakra.button
                                  type="button"
                                  onClick={() => setEditingListing({ listing, initialTab: 'videos' })}
                                  display="inline-flex"
                                  alignItems="center"
                                  gap="5px"
                                  px="8px"
                                  py="3px"
                                  borderRadius="full"
                                  bg={listing.video_count > 0 ? '#eaf2ff' : 'gray.100'}
                                  color={listing.video_count > 0 ? '#0757c7' : 'gray.600'}
                                  fontSize="12px"
                                  fontWeight="600"
                                  cursor="pointer"
                                  border="none"
                                  _hover={{ bg: listing.video_count > 0 ? '#d4e5ff' : 'gray.200' }}
                                  title={t('Управление видеороликами объекта', 'Manage property videos')}
                                >
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                    <path d="m10 9 5 3-5 3V9z" />
                                  </svg>
                                  <span>{listing.video_count ?? 0}</span>
                                </chakra.button>
                              </Table.Cell>
                              <Table.Cell>
                                <Box
                                  as="span"
                                  display="inline-flex"
                                  px="9px"
                                  py="4px"
                                  borderRadius="full"
                                  bg={listing.is_active ? 'green.50' : 'gray.100'}
                                  color={listing.is_active ? 'green.700' : 'gray.700'}
                                  fontSize="12px"
                                  fontWeight="600"
                                >
                                  {listing.is_active
                                    ? t('Активен', 'Active')
                                    : t('Неактивен', 'Inactive')}
                                </Box>
                              </Table.Cell>
                              <Table.Cell>{formatDate(listing.created_at, lang)}</Table.Cell>
                              <Table.Cell w="145px">
                                <Flex direction="column" gap="5px" align="stretch">
                                  <HotelierTableAction
                                    type="button"
                                    appearance="soft"
                                    w="100%"
                                    h="auto"
                                    minH="28px"
                                    py="4px"
                                    whiteSpace="normal"
                                    onClick={() => setEditingListing({ listing, initialTab: 'details' })}
                                  >
                                    {t('Изменить', 'Edit')}
                                  </HotelierTableAction>
                                  <HotelierTableAction
                                    type="button"
                                    appearance="soft"
                                    w="100%"
                                    h="auto"
                                    minH="28px"
                                    py="4px"
                                    whiteSpace="normal"
                                    onClick={() => setEditingListing({ listing, initialTab: 'videos' })}
                                  >
                                    {t('Видео', 'Videos')}
                                  </HotelierTableAction>
                                  <HotelierTableAction
                                    type="button"
                                    appearance="soft"
                                    w="100%"
                                    h="auto"
                                    minH="28px"
                                    py="4px"
                                    whiteSpace="normal"
                                    color={listing.is_active ? 'red.700' : 'green.700'}
                                    disabled={listingActiveState.isLoading}
                                    onClick={() => void toggleListingActive(listing)}
                                  >
                                    {listing.is_active
                                      ? t('Деактивировать', 'Deactivate')
                                      : t('Активировать', 'Activate')}
                                  </HotelierTableAction>
                                </Flex>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </HotelierTable>
                  </Box>
                </>
              )}
              {editingListing && (
                <HotelierListingEditDialog
                  listing={editingListing.listing}
                  initialTab={editingListing.initialTab}
                  featureTags={dictionaries.data?.features ?? []}
                  lang={lang}
                  onClose={() => setEditingListing(null)}
                />
              )}
              {creatingListing && dictionaries.data && (
                <HotelierListingCreateDialog
                  dictionaries={dictionaries.data}
                  lang={lang}
                  onClose={() => setCreatingListing(false)}
                />
              )}
            </Stack>
          ) : tab === 'bookings' ? (
            <HotelierBookings listings={assignedListings} titleFor={titleFor} lang={lang} />
          ) : tab === 'reviews' ? (
            <HotelierReviews listings={assignedListings} titleFor={titleFor} lang={lang} />
          ) : tab === 'inventory' ? (
            <HotelierInventory listings={assignedListings} lang={lang} />
          ) : (
            <HotelierMessages listings={assignedListings} titleFor={titleFor} lang={lang} />
          )}
        </Box>
      </Flex>
      <Box
        as="nav"
        aria-label={t('Разделы кабинета', 'Dashboard sections')}
        display={{ base: 'block', lg: 'none' }}
        position="fixed"
        bottom="0"
        left="0"
        right="0"
        zIndex="sticky"
        bg="rgba(255, 255, 255, 0.94)"
        backdropFilter="blur(18px)"
        borderTop="1px solid"
        borderColor="gray.200"
        px="max(4px, env(safe-area-inset-left))"
        pr="max(4px, env(safe-area-inset-right))"
        pb="max(8px, env(safe-area-inset-bottom))"
      >
        <Flex maxW="640px" mx="auto" justify="space-around" align="stretch">
          {TABS.map((item) => {
            const active = tab === item.id;
            const unread = item.id === 'messages' ? (unreadMessages.data?.meta.total ?? 0) : 0;
            return (
              <chakra.button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                aria-label={item.label[lang]}
                onClick={() => router.replace(`/hotelier?tab=${item.id}`)}
                flex="1"
                minW="0"
                minH="62px"
                pt="9px"
                px="2px"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                gap="3px"
                color={active ? 'blue.700' : 'gray.600'}
                _active={{ bg: 'gray.100' }}
                _focusVisible={{
                  outline: '2px solid',
                  outlineColor: 'blue.600',
                  outlineOffset: '-3px',
                  borderRadius: '8px',
                }}
              >
                <Box position="relative" lineHeight="0">
                  <HotelierTabIcon id={item.id} />
                  {unread > 0 && (
                    <Box
                      as="span"
                      position="absolute"
                      top="-5px"
                      right="-13px"
                      minW="16px"
                      h="16px"
                      px="3px"
                      borderRadius="full"
                      bg="red.600"
                      color="white"
                      fontSize="10px"
                      fontWeight="700"
                      lineHeight="16px"
                      textAlign="center"
                    >
                      {unread > 99 ? '99+' : unread}
                    </Box>
                  )}
                </Box>
                <Text
                  as="span"
                  fontSize="11px"
                  fontWeight={active ? '700' : '500'}
                  lineHeight="1.2"
                  whiteSpace="nowrap"
                >
                  {MOBILE_TAB_LABELS[item.id][lang]}
                </Text>
              </chakra.button>
            );
          })}
        </Flex>
      </Box>
      {statusToast && (
        <Box
          role="status"
          aria-live="polite"
          position="fixed"
          right={{ base: '12px', md: '24px' }}
          bottom={{ base: 'calc(86px + env(safe-area-inset-bottom))', lg: '24px' }}
          zIndex="toast"
          maxW="min(440px, calc(100vw - 24px))"
          px="14px"
          py="12px"
          border="1px solid"
          borderColor="green.200"
          borderRadius="12px"
          bg="white"
          color="green.800"
          boxShadow="0 8px 24px rgba(17, 24, 39, 0.14)"
        >
          <Flex align="center" gap="10px">
            <Box color="green.600" flexShrink="0" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            </Box>
            <Text flex="1" fontSize="14px" fontWeight="500">
              {statusToast.message}
            </Text>
            <IconButton
              label={t('Закрыть уведомление', 'Dismiss notification')}
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              flexShrink="0"
              w="28px"
              h="28px"
              borderRadius="6px"
              color="green.800"
              _hover={{ bg: 'green.50' }}
              onClick={() => setStatusToast(null)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </IconButton>
          </Flex>
        </Box>
      )}
    </Stack>
  );
};
