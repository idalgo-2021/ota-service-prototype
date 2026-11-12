'use client';

import { Box, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { ProfileLink } from '@/shared/profile-link';
import { CartPanel } from '../CartPanel';
import { Showcase } from '../Showcase';
import {
  asideStyle,
  backLinkStyle,
  layoutStyle,
  mainStyle,
  headerStyle,
  messageStyle,
  rootStyle,
  subtitleLinkStyle,
  subtitleStyle,
  titleStyle,
} from './TripServicesPage.styles';
import { useController } from './useController';

const MESSAGES = {
  guest: 'Войдите через кнопку «Войти» вверху страницы, чтобы добавить услуги к поездке.',
  error: 'Не удалось открыть поездку. Возможно, бронь оформлена с другой учетной записи.',
  over: 'Эта поездка уже завершена или отменена — добавить к ней ничего нельзя.',
};

type TripServicesPageProps = {
  bookingId: string;
};

/**
 * Витрина к конкретной брони: заголовок с объектом, городом и датами поездки, под ним
 * экскурсии, услуги и товары этого города и корзина сбоку. Экскурсии предлагаются только
 * в дни поездки.
 */
export const TripServicesPage = ({ bookingId }: TripServicesPageProps) => {
  const {
    status,
    cart,
    listingId,
    listingTitle,
    locationId,
    locationName,
    trip,
    dates,
    participants,
  } = useController(bookingId);

  const renderContent = () => {
    if (status === 'pending' || status === 'loading') {
      return null;
    }
    if (status !== 'ready' || locationId === undefined) {
      return <Text {...messageStyle}>{MESSAGES[status === 'ready' ? 'error' : status]}</Text>;
    }
    return (
      <Flex {...layoutStyle}>
        <Box {...mainStyle}>
          <Showcase
            locationId={locationId}
            trip={trip}
            cart={cart}
            defaultQuantity={participants}
          />
        </Box>
        <Box as="aside" {...asideStyle}>
          <CartPanel cart={cart} mode="summary" bookingId={bookingId} />
        </Box>
      </Flex>
    );
  };

  return (
    <Stack as="main" {...rootStyle}>
      <ProfileLink tab="bookings" style={backLinkStyle}>
        ← Брони
      </ProfileLink>
      <Stack {...headerStyle}>
        <Heading as="h1" {...titleStyle}>
          Экскурсии и услуги к поездке
        </Heading>
        {listingId && listingTitle && (
          <Text {...subtitleStyle}>
            <Link href={`/listings/${listingId}`} style={subtitleLinkStyle}>
              {listingTitle}
            </Link>
            {[locationName, dates].filter(Boolean).map((part) => ` · ${part}`)}
          </Text>
        )}
      </Stack>
      {renderContent()}
    </Stack>
  );
};
