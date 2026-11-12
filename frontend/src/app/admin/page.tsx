import { AdminPage } from '@/views/admin';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Маршрут `/admin`: раздел берёт из `tab` в адресе, по умолчанию — брони. */
const Page = async ({ searchParams }: PageProps<'/admin'>) => {
  const { tab, record } = await searchParams;

  return <AdminPage tab={first(tab) ?? 'bookings'} record={first(record)} />;
};

export default Page;
