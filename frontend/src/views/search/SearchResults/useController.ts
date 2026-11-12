import { useMinimumDuration } from '@/lib/hooks';
import { getDemoReviews } from '@/lib/reviews';
import { toStayParams, type Stay } from '@/lib/stay';
import type { SegmentedControlOption } from '@/shared/segmented-control';
import type { SearchDistance } from '../distance';
import { ALL_POI_CATEGORIES, type PoiCategory } from '../SearchMap/pois';
import { ALL_TAB, type SearchSort, useListingsSearch } from '../useListingsSearch';

type Search = ReturnType<typeof useListingsSearch>;
type Status = 'loading' | 'ready' | 'empty' | 'notFound' | 'error' | 'chooseCity';

export const useController = (
  destination: string,
  stay: Stay,
  search: Search,
  sort: SearchSort,
  visibleCount: number,
  selectedId?: string,
  tab?: string,
  distance?: SearchDistance,
  locationIds?: number[],
  poiCategories?: PoiCategory[]
) => {
  const loading = useMinimumDuration(search.isPending || search.isLoading, 700);
  const tabsLoading = useMinimumDuration(search.isPending || search.loadingDictionaries, 700);
  const listingTypes = search.dictionaries.data?.listing_types ?? [];
  const tabs: SegmentedControlOption<string>[] = [
    { value: ALL_TAB, label: 'Все', title: 'Показать все варианты' },
    ...listingTypes.map((type) => ({
      value: String(type.id),
      label: type.name,
      title: `Показать: ${type.name}`,
    })),
  ];
  const typeNames = new Map(listingTypes.map((type) => [type.id, type.name]));
  const locationNames = new Map(
    (search.dictionaries.data?.locations ?? []).map((location) => [location.id, location.name])
  );
  const listingParams = toStayParams(stay);
  if (destination) {
    listingParams.set('query', destination);
  }
  const locIds = locationIds?.length ? locationIds : search.locationIds;
  if (locIds?.length) {
    listingParams.set('location_ids', locIds.join(','));
  }
  if (tab) {
    listingParams.set('tab', tab);
  }
  if (sort?.price) {
    listingParams.set('sort_price', sort.price);
  }
  if (sort?.rating) {
    listingParams.set('sort_rating', sort.rating);
  }
  if (distance && distance !== 'any') {
    listingParams.set('distance', distance);
  }
  if (poiCategories !== undefined && poiCategories.length !== ALL_POI_CATEGORIES.length) {
    listingParams.set('poi_categories', poiCategories.length ? poiCategories.join(',') : 'none');
  }
  const sortedItems = [...search.items].sort((a, b) => {
    if (!search.nights && sort.price) {
      const order = sort.price === 'asc' ? 1 : -1;
      return (
        order *
        ((a.price?.perNight ?? Number.POSITIVE_INFINITY) -
          (b.price?.perNight ?? Number.POSITIVE_INFINITY))
      );
    }
    return 0;
  });
  const firstItems = sortedItems.slice(0, visibleCount);
  const selectedOutside =
    selectedId && !firstItems.some(({ listing }) => listing.id === selectedId)
      ? search.items.find(({ listing }) => listing.id === selectedId)
      : undefined;
  const visibleItems = selectedOutside ? [selectedOutside, ...firstItems] : firstItems;
  const items = visibleItems.map(({ listing, price }) => ({
    listing,
    price,
    nights: search.nights,
    guests: stay.guests,
    href: `/listings/${listing.id}?${listingParams}&selected_id=${listing.id}`,
    typeName: typeNames.get(listing.listing_type_id),
    locationName: locationNames.get(listing.location_id),
    reviews: getDemoReviews(listing),
  }));

  const status: Status =
    !search.hasArea && !search.hasDestination
      ? 'chooseCity'
      : !search.hasArea && search.destinationNotFound
        ? 'notFound'
        : loading
          ? 'loading'
          : items.length
            ? 'ready'
            : search.isError
              ? 'error'
              : 'empty';
  const place = search.hasArea ? 'в области на карте' : destination;
  const summary =
    !search.hasArea && !search.hasDestination
      ? 'Выберите направление'
      : search.total === undefined || loading
        ? `Ищем ${place}`
        : `Найдено ${search.total}`;

  return {
    tabs,
    tabsLoading,
    summary,
    status,
    items,
    hasMore: sortedItems.length > visibleCount,
    sort: sort ?? search.activeSort,
  };
};
