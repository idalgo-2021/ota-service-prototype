import { formatGuests, type Stay } from '@/lib/stay';
import { formatIsoDate } from '@/shared/date-range-picker';

const formatDates = (checkin?: string, checkout?: string) => {
  const from = checkin && formatIsoDate(checkin);
  const to = checkout && formatIsoDate(checkout);

  if (from && to) {
    return `${from} — ${to}`;
  }
  if (from) {
    return `с ${from}`;
  }
  if (to) {
    return `по ${to}`;
  }

  return undefined;
};

export const useController = ({ checkin, checkout, guests }: Stay) => {
  const dates = formatDates(checkin, checkout);
  return { dates, guests: formatGuests(guests) };
};
