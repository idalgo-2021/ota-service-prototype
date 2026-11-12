import { parseStay } from '@/lib/stay';
import { ListingPage, type SearchFiltersParams } from '@/views/listing';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Маршрут `/listings/[id]`: объект размещения. Даты `checkin`, `checkout` и гостей
 * `adults`, `children`, `pets` берёт из адреса, чтобы сразу показать свободные номера,
 * а направление `query` и фильтры — чтобы ссылка «Назад» вернула к той же выдаче поиска.
 */
const Page = async ({ params, searchParams }: PageProps<'/listings/[id]'>) => {
  const { id } = await params;
  const sp = await searchParams;
  const stay = parseStay({
    checkin: first(sp.checkin),
    checkout: first(sp.checkout),
    adults: first(sp.adults),
    children: first(sp.children),
    pets: first(sp.pets),
  });

  const searchFilters: SearchFiltersParams = {
    query: first(sp.query),
    location_ids: first(sp.location_ids),
    tab: first(sp.tab),
    sort_price: first(sp.sort_price),
    sort_rating: first(sp.sort_rating),
    distance: first(sp.distance),
    selected_id: first(sp.selected_id) || first(sp.hotel_id),
    poi_categories: first(sp.poi_categories),
  };

  return <ListingPage id={id} stay={stay} searchFilters={searchFilters} />;
};

export default Page;
