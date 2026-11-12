import { skipToken } from '@reduxjs/toolkit/query';
import { useGetDictionariesQuery, useGetListingQuery, useGetMyBookingQuery } from '@/lib/api';
import { useAppSelector } from '@/lib/hooks';
import { formatIsoDate } from '@/shared/date-range-picker';
import { useCart } from '../useCart';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';

type Status = 'pending' | 'guest' | 'error' | 'loading' | 'over' | 'ready';

export const useController = (bookingId: string) => {
  const { accessToken, restored } = useAppSelector((state) => state.auth);
  const { lang, ready: languageReady } = useCatalogLanguage();
  const booking = useGetMyBookingQuery(accessToken ? bookingId : skipToken);
  const listing = useGetListingQuery(
    languageReady && booking.data?.listing_id ? { id: booking.data.listing_id, lang } : skipToken
  );
  const dictionaries = useGetDictionariesQuery(languageReady ? lang : skipToken);
  const cart = useCart();

  const getStatus = (): Status => {
    if (!restored) {
      return 'pending';
    }
    if (!accessToken) {
      return 'guest';
    }
    if (booking.isError || listing.isError) {
      return 'error';
    }
    if (!booking.data || !listing.data) {
      return 'loading';
    }
    // К завершённой или отменённой поездке докупать нечего.
    return booking.data.status === 'completed' || booking.data.status === 'canceled'
      ? 'over'
      : 'ready';
  };

  const locationName = dictionaries.data?.locations.find(
    (location) => location.id === listing.data?.location_id
  )?.name;

  return {
    status: getStatus(),
    cart,
    listingId: booking.data?.listing_id,
    listingTitle: listing.data?.title,
    locationId: listing.data?.location_id,
    locationName,
    trip: booking.data
      ? { from: booking.data.check_in_date, to: booking.data.check_out_date }
      : undefined,
    dates: booking.data
      ? `${formatIsoDate(booking.data.check_in_date, { withYear: false })} — ${formatIsoDate(
          booking.data.check_out_date
        )}`
      : undefined,
    participants: booking.data ? booking.data.adults_count + booking.data.children_count : 1,
  };
};
