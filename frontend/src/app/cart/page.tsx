import { CartPage } from '@/views/marketplace/CartPage';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function Page({ searchParams }: PageProps<'/cart'>) {
  return <CartPage bookingId={first((await searchParams).booking_id)} />;
}
