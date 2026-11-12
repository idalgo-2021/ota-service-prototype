import { ProfilePage, type ProfileTab } from '@/views/profile';

const TABS: ProfileTab[] = ['personal', 'settings', 'bookings', 'orders', 'reviews'];
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Одинаковое содержимое профиля для обычной страницы и окна поверх текущей страницы. */
export const ProfileRoute = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const { tab, created, services } = await searchParams;
  const tabValue = first(tab);
  const servicesResult = first(services);

  return (
    <ProfilePage
      tab={TABS.find((value) => value === tabValue) ?? 'personal'}
      createdBookingId={first(created)}
      bookingServices={
        servicesResult === 'confirmed' || servicesResult === 'failed' ? servicesResult : undefined
      }
    />
  );
};
