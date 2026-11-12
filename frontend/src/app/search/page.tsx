import { parseStay } from '@/lib/stay';
import {
  ALL_POI_CATEGORIES,
  SearchPage,
  type PoiCategory,
  type SearchDistance,
  type SearchSort,
} from '@/views/search';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Маршрут `/search`: берёт направление `query`, даты `checkin`, `checkout`, гостей
 * `adults`, `children`, `pets`, фильтры `location_ids`, `tab`, `sort_price`, `sort_rating`,
 * `distance`, слои карты `poi_categories` и выбранный объект `selected_id` из адреса
 * и рисует страницу результатов поиска.
 */
const Page = async ({ searchParams }: PageProps<'/search'>) => {
  const {
    query,
    checkin,
    checkout,
    adults,
    children,
    pets,
    location_ids,
    tab,
    sort_price,
    sort_rating,
    distance,
    selected_id,
    hotel_id,
    poi_categories,
  } = await searchParams;
  const stay = parseStay({
    checkin: first(checkin),
    checkout: first(checkout),
    adults: first(adults),
    children: first(children),
    pets: first(pets),
  });

  const locationIds = (first(location_ids) ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0);

  const rawSortPrice = first(sort_price);
  const rawSortRating = first(sort_rating);
  const initialSort: SearchSort | null =
    rawSortPrice || rawSortRating
      ? {
          ...(rawSortPrice === 'asc' || rawSortPrice === 'desc' ? { price: rawSortPrice } : {}),
          ...(rawSortRating === 'asc' || rawSortRating === 'desc' ? { rating: rawSortRating } : {}),
        }
      : null;

  const rawDistance = first(distance);
  const validDistances: SearchDistance[] = ['any', 'under_1', '1_to_3', '3_to_5', 'over_5'];
  const initialDistance = validDistances.includes(rawDistance as SearchDistance)
    ? (rawDistance as SearchDistance)
    : undefined;

  const rawPoiCategories = first(poi_categories);
  const initialPoiCategories: PoiCategory[] | undefined =
    rawPoiCategories === undefined
      ? undefined
      : rawPoiCategories === 'none' || rawPoiCategories === ''
        ? []
        : (rawPoiCategories
            .split(',')
            .filter((cat) => ALL_POI_CATEGORIES.includes(cat as PoiCategory)) as PoiCategory[]);

  const initialTab = first(tab) ?? null;
  const initialSelectedId = first(selected_id) ?? first(hotel_id);

  return (
    <SearchPage
      destination={first(query) ?? ''}
      stay={stay}
      locationIds={locationIds}
      guestsExplicit={adults !== undefined || children !== undefined || pets !== undefined}
      initialTab={initialTab}
      initialSort={initialSort}
      initialDistance={initialDistance}
      initialSelectedId={initialSelectedId}
      initialPoiCategories={initialPoiCategories}
    />
  );
};

export default Page;
