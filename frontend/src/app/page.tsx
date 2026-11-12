import { parseStay } from '@/lib/stay';
import { MainPage } from '@/views/main';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Маршрут `/`: главная страница с возможностью восстановить параметры поиска. */
const Page = async ({ searchParams }: PageProps<'/'>) => {
  const { query, location_ids, checkin, checkout, adults, children, pets } = await searchParams;
  const hasSearchParams = [query, location_ids, checkin, checkout, adults, children, pets].some(
    (value) => value !== undefined
  );
  const initialValues = hasSearchParams
    ? {
        destination: first(query) ?? '',
        locationIds: (first(location_ids) ?? '')
          .split(',')
          .map(Number)
          .filter((id) => Number.isSafeInteger(id) && id > 0),
        stay: parseStay({
          checkin: first(checkin),
          checkout: first(checkout),
          adults: first(adults),
          children: first(children),
          pets: first(pets),
        }),
        guestsExplicit: adults !== undefined || children !== undefined || pets !== undefined,
      }
    : undefined;

  return <MainPage initialValues={initialValues} />;
};

export default Page;
