import { TripServicesPage } from '@/views/marketplace';

/** Маршрут `/bookings/[id]/services`: экскурсии и услуги к поездке по брони. */
const Page = async ({ params }: PageProps<'/bookings/[id]/services'>) => {
  const { id } = await params;

  return <TripServicesPage bookingId={id} />;
};

export default Page;
