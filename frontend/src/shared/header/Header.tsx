'use client';

import { skipToken } from '@reduxjs/toolkit/query';
import { Box, Flex, Image } from '@chakra-ui/react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  useGetMyListingReviewsQuery,
  useGetMyOrdersQuery,
  useGetMyProductReviewsQuery,
  type CatalogLanguage,
  type MyReviewsParams,
} from '@/lib/api';
import { getRole, getUserId } from '@/lib/auth';
import { formatCount } from '@/lib/format';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  bookingNotificationsRestored,
  bookingNotificationsViewed,
  loadBookingNotifications,
} from '@/lib/assistantNotifications';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import {
  CartIcon,
  MapIcon,
  NotificationIcon,
  UserIcon,
} from '@/shared/icons';
import { ProfileLink } from '@/shared/profile-link';

import { CartModal } from '@/views/marketplace/CartModal';
import { CartPage } from '@/views/marketplace/CartPage';
import { HotelCompare } from '@/shared/hotel-compare/HotelCompare';

import { AuthMenu } from './AuthMenu';
import styles from './Header.module.css';
import { getHeaderStyle, logoLinkStyle, logoStyle } from './Header.styles';
import { useController } from './useController';

const pendingOrderParams = { limit: 1, offset: 0, status: 'pending' as const };
const draftReviewParams: MyReviewsParams = { limit: 1, offset: 0, status: 'draft' };

const COPY = {
  ru: {
    stays: 'Жилье',
    profile: 'Профиль',
    products: 'Впечатления',
    cart: 'Корзина',
    notifications: 'Уведомления',
    notificationsSoon: 'Новых уведомлений пока нет.',
    bookingCreated: 'Бронь успешно создана.',
    bookingsAction: 'Перейти к бронированиям →',
    reviewsAction: 'Перейти к отзывам →',
    home: 'На главную',
  },
  en: {
    stays: 'Stays',
    profile: 'Profile',
    products: 'Experiences',
    cart: 'Cart',
    notifications: 'Notifications',
    notificationsSoon: 'No new notifications yet.',
    bookingCreated: 'Booking created successfully.',
    bookingsAction: 'View bookings →',
    reviewsAction: 'Open reviews →',
    home: 'Home',
  },
} as const;

const HeaderActions = ({ lang }: { lang: CatalogLanguage }) => {
  const [cartOpen, setCartOpen] = useState(false);
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const userId = getUserId(accessToken);
  const client = !!accessToken && getRole(accessToken) === 'user';
  const hotelier = !!accessToken && getRole(accessToken) === 'hotelier';
  const staff = !!accessToken && ['manager', 'admin'].includes(getRole(accessToken) ?? '');
  const pendingOrders = useGetMyOrdersQuery(client ? pendingOrderParams : skipToken, {
    pollingInterval: 60_000,
  });
  const listingDrafts = useGetMyListingReviewsQuery(client ? draftReviewParams : skipToken, {
    pollingInterval: 60_000,
  });
  const productDrafts = useGetMyProductReviewsQuery(client ? draftReviewParams : skipToken, {
    pollingInterval: 60_000,
  });
  const cartCount = client
    ? (pendingOrders.data?.items[0]?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0)
    : 0;
  const reviewCount = client
    ? (listingDrafts.data?.meta.total ?? 0) + (productDrafts.data?.meta.total ?? 0)
    : 0;
  const bookingNotices = useAppSelector((state) => state.assistantNotifications.bookings);
  const bookingNotifications = useMemo(
    () => (userId ? bookingNotices.filter((notice) => notice.userId === userId) : []),
    [bookingNotices, userId]
  );
  const notificationCount = reviewCount + bookingNotifications.length;
  const t = COPY[lang];

  useEffect(() => {
    if (userId) {
      dispatch(
        bookingNotificationsRestored({
          userId,
          bookings: loadBookingNotifications(userId),
        })
      );
    }
  }, [dispatch, userId]);

  return (
    <Flex className={styles.actions}>
      <HotelCompare lang={lang} />
      {client && (
        <>
          <Box as="details" className={styles.notification}>
            <Box
              as="summary"
              className={styles.action}
              aria-label={
                notificationCount
                  ? lang === 'en'
                    ? `${notificationCount} notifications`
                    : formatCount(notificationCount, ['уведомление', 'уведомления', 'уведомлений'])
                  : t.notifications
              }
              title={t.notifications}
            >
              <NotificationIcon size={20} />
              {notificationCount > 0 && (
                <span className={styles.badge}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Box>
            <Box className={styles.notificationMessage}>
              {bookingNotifications.map((notice) => (
                <ProfileLink
                  key={notice.bookingId}
                  tab="bookings"
                  className={styles.notificationLink}
                  onClick={() => {
                    if (userId) {
                      dispatch(bookingNotificationsViewed(userId));
                    }
                  }}
                >
                  <span>{t.bookingCreated}</span>
                  <span>{t.bookingsAction}</span>
                </ProfileLink>
              ))}
              {reviewCount > 0 ? (
                <ProfileLink tab="reviews" className={styles.notificationLink}>
                  <span>
                    {lang === 'en'
                      ? `${reviewCount} ${reviewCount === 1 ? 'review is' : 'reviews are'} ready to fill in.`
                      : `Нужно заполнить ${formatCount(reviewCount, ['отзыв', 'отзыва', 'отзывов'])}.`}
                  </span>
                  <span>{t.reviewsAction}</span>
                </ProfileLink>
              ) : notificationCount === 0 ? (
                t.notificationsSoon
              ) : null}
            </Box>
          </Box>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className={styles.action}
            aria-label={cartCount ? `${t.cart}: ${cartCount}` : t.cart}
            title={t.cart}
          >
            <CartIcon size={20} />
            {cartCount > 0 && (
              <span className={styles.badge}>{cartCount > 9 ? '9+' : cartCount}</span>
            )}
          </button>
          {cartOpen && (
            <CartModal open onClose={() => setCartOpen(false)}>
              <CartPage modal />
            </CartModal>
          )}
        </>
      )}
      {client && (
        <ProfileLink className={styles.profileLink} aria-label={t.profile}>
          <UserIcon size={20} />
          <span className={styles.profileLabel}>{t.profile}</span>
        </ProfileLink>
      )}
      {hotelier && (
        <Link
          href="/hotelier?tab=profile"
          className={styles.profileLink}
          aria-label={t.profile}
          title={t.profile}
        >
          <UserIcon size={20} />
          <span className={styles.profileLabel}>{t.profile}</span>
        </Link>
      )}
      {staff && (
        <Link
          href="/admin?tab=profile"
          className={styles.profileLink}
          aria-label={t.profile}
          title={t.profile}
        >
          <UserIcon size={20} />
          <span className={styles.profileLabel}>{t.profile}</span>
        </Link>
      )}
      <AuthMenu lang={lang} />
    </Flex>
  );
};

const locationIdsForPath = (
  pathname: string,
  searchParams: { get: (key: string) => string | null }
) => {
  const raw =
    pathname === '/search'
      ? searchParams.get('location_ids')
      : pathname === '/products'
        ? searchParams.get('location_id')
        : pathname === '/'
          ? searchParams.get('location_ids')
          : null;
  return (raw ?? '')
    .split(',')
    .map(Number)
    .filter(
      (id, index, values) => Number.isSafeInteger(id) && id > 0 && values.indexOf(id) === index
    );
};

const HomeLogo = ({ href, label }: { href: string; label: string }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationIds = locationIdsForPath(pathname, searchParams);
  const homeParams = new URLSearchParams();
  if (href === '/') {
    if (locationIds.length) {
      homeParams.set('location_ids', locationIds.join(','));
    }
    if (pathname === '/search' || pathname === '/') {
      for (const key of ['adults', 'children', 'pets']) {
        const value = searchParams.get(key);
        if (value !== null) {
          homeParams.set(key, value);
        }
      }
    }
  }
  const destination = homeParams.size ? `/?${homeParams}` : href;

  return (
    <Link href={destination} aria-label={label} style={logoLinkStyle}>
      <Image alt="" src="/logo.svg" {...logoStyle} />
    </Link>
  );
};

type NavSection = 'stays' | 'products';

const NAV_SECTIONS: { section: NavSection; paths: string[] }[] = [
  { section: 'stays', paths: ['/search', '/listings'] },
  { section: 'products', paths: ['/products'] },
];

const NAV_ICONS = {
  stays: MapIcon,
  products: CartIcon,
} as const;

const getActiveSection = (pathname: string) =>
  NAV_SECTIONS.find(({ paths }) =>
    paths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  )?.section;

/** Пункты основного меню; пункт раздела, в котором сейчас пользователь, подсвечен. */
const NavLinks = ({
  lang,
  hrefs = { stays: '/search', products: '/products' },
}: {
  lang: CatalogLanguage;
  hrefs?: Record<NavSection, string>;
}) => {
  const pathname = usePathname();
  const active = getActiveSection(pathname);
  const isMarketplaceLabeled =
    pathname === '/' ||
    pathname === '/search' ||
    pathname === '/products' ||
    pathname.startsWith('/products/');
  const labels = isMarketplaceLabeled
    ? { ...COPY[lang], products: lang === 'en' ? 'Marketplace' : 'Маркетплейс' }
    : COPY[lang];

  return (
    <Flex as="nav" className={styles.primaryNav} aria-label="Основная навигация">
      {NAV_SECTIONS.map(({ section }) => {
        const Icon = NAV_ICONS[section];

        return (
          <Link
            key={section}
            href={hrefs[section]}
            className={styles.navLink}
            aria-current={section === active ? 'page' : undefined}
            aria-label={labels[section]}
            title={labels[section]}
          >
            <span className={styles.navIcon} aria-hidden="true">
              <Icon size={26} />
            </span>
            <span className={styles.navLabel}>{labels[section]}</span>
          </Link>
        );
      })}
    </Flex>
  );
};

const PrimaryNavigation = ({ lang }: { lang: CatalogLanguage }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationIds = locationIdsForPath(pathname, searchParams);
  const locationId = locationIds[0];
  const staysHref =
    (pathname === '/products' || pathname === '/') && locationId
      ? `/search?location_ids=${locationIds.join(',')}`
      : '/search';
  const productsHref =
    (pathname === '/search' || pathname === '/') && locationId
      ? `/products?location_id=${locationId}`
      : '/products';

  return (
    <NavLinks
      lang={lang}
      hrefs={{ stays: staysHref, products: productsHref }}
    />
  );
};

/**
 * Шапка сайта с логотипом «Островок!», ведущим на главную (сотрудника — в админку),
 * и кнопкой входа справа.
 * На главной без нижней границы, на остальных страницах — с тонкой линией снизу.
 */
export const Header = () => {
  const { isMain, homeHref } = useController();
  const { lang } = useCatalogLanguage();
  const showNavigation = !homeHref.startsWith('/admin') && !homeHref.startsWith('/hotelier');

  return (
    <Flex as="header" className={styles.header} {...getHeaderStyle(isMain)}>
      <Suspense
        fallback={
          <Link href={homeHref} aria-label={COPY[lang].home} style={logoLinkStyle}>
            <Image alt="" src="/logo.svg" {...logoStyle} />
          </Link>
        }
      >
        <HomeLogo href={homeHref} label={COPY[lang].home} />
      </Suspense>
      {showNavigation && (
        <Suspense fallback={<NavLinks lang={lang} />}>
          <PrimaryNavigation lang={lang} />
        </Suspense>
      )}
      <HeaderActions lang={lang} />
    </Flex>
  );
};
