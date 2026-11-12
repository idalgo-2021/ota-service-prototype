import { HotelierPage, type HotelierTab } from '@/views/hotelier/HotelierPage';

const TABS: HotelierTab[] = ['bookings', 'reviews', 'inventory', 'messages', 'listings', 'profile'];
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const Page = async ({ searchParams }: PageProps<'/hotelier'>) => {
  const { tab } = await searchParams;
  const requestedTab = first(tab);
  return <HotelierPage tab={TABS.find((value) => value === requestedTab) ?? 'bookings'} />;
};

export default Page;
