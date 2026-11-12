import type { Booking, BookingStatus, CatalogLanguage } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { formatGuests, formatNights, getNights } from '@/lib/stay';
import { formatIsoDate } from '@/shared/date-range-picker';
import type { StatusTone } from '@/shared/status-badge';

const STATUSES: Record<BookingStatus, { ru: string; en: string; tone: StatusTone }> = {
  confirmed: { ru: 'Подтверждена', en: 'Confirmed', tone: 'active' },
  checked_in: { ru: 'Идет проживание', en: 'Stay in progress', tone: 'active' },
  completed: { ru: 'Завершена', en: 'Completed', tone: 'done' },
  canceled: { ru: 'Отменена', en: 'Cancelled', tone: 'canceled' },
};

export const useController = (booking: Booking, lang: CatalogLanguage) => {
  const nights = getNights(booking.check_in_date, booking.check_out_date);
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  const nightsText =
    nights == null
      ? ''
      : lang === 'en'
        ? `${nights} ${nights === 1 ? 'night' : 'nights'}`
        : formatNights(nights);
  const guests =
    lang === 'en'
      ? [
          `${booking.adults_count} ${booking.adults_count === 1 ? 'adult' : 'adults'}`,
          booking.children_count
            ? `${booking.children_count} ${booking.children_count === 1 ? 'child' : 'children'}`
            : null,
          booking.has_pets ? 'with a pet' : null,
        ]
          .filter(Boolean)
          .join(', ')
      : formatGuests({
          adults: booking.adults_count,
          children: booking.children_count,
          pets: booking.has_pets,
        });

  return {
    title:
      (lang === 'ru'
        ? booking.listing_title_ru || booking.listing_title
        : booking.listing_title || booking.listing_title_ru) ||
      (lang === 'en' ? 'Accommodation' : 'Объект размещения'),
    dates: `${formatIsoDate(booking.check_in_date, { locale })} — ${formatIsoDate(booking.check_out_date, { locale })}${
      nights ? `, ${nightsText}` : ''
    }`,
    guests,
    total: formatMoney(booking.total, booking.currency, locale),
    status: { label: STATUSES[booking.status][lang], tone: STATUSES[booking.status].tone },
    // Гость отменяет бронь сам только до заезда.
    cancellable: booking.status === 'confirmed',
    // Экскурсии и услуги докупают к поездке, пока она не закончилась.
    servicesHref:
      booking.status === 'confirmed' || booking.status === 'checked_in'
        ? `/bookings/${booking.id}/services`
        : undefined,
  };
};
