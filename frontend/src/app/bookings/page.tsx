import { redirect } from 'next/navigation';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Маршрут `/bookings`: брони теперь во вкладке профиля, поэтому перенаправляем туда,
 * сохраняя `created` (только что оформленная бронь) и `services` (оформились ли с ней услуги).
 */
const Page = async ({ searchParams }: PageProps<'/bookings'>) => {
  const { created, services } = await searchParams;
  const params = new URLSearchParams({ tab: 'bookings' });
  for (const [name, value] of Object.entries({ created, services })) {
    const text = first(value);
    if (text) {
      params.set(name, text);
    }
  }
  redirect(`/profile?${params}`);
};

export default Page;
