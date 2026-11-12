import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDemoReviews } from '@/lib/reviews';
import { formatGuestsForPrice, toStayParams, type Stay } from '@/lib/stay';
import type { MapHotel, MapPosition, SearchArea, SearchMapData } from '../SearchMap';
import { ALL_POI_CATEGORIES, type PoiCategory } from '../SearchMap/pois';
import { geocode } from '../SearchMap/geocode';
import { SAINT_PETERSBURG_CENTER } from '../SearchMap/constants';
import type { SearchDistance } from '../distance';
import { type SearchSort, type SearchItem, useListingsSearch } from '../useListingsSearch';

/** Фиксированный центр карты поиска — Санкт‑Петербург. */
const FALLBACK_CENTER: MapPosition = SAINT_PETERSBURG_CENTER;

// Метка показывает цену «от», если у объекта есть активный вариант с ценой.
const toMapHotels = (
  items: SearchItem[],
  priceGuests: string | undefined,
  typeNames: Map<number, string>,
  locationNames: Map<number, string>,
  listingParams: URLSearchParams
) =>
  items.flatMap(({ listing, price }): MapHotel[] => {
    const { id, title, latitude, longitude } = listing;
    const reviews = getDemoReviews(listing);
    const address = [locationNames.get(listing.location_id), listing.address]
      .filter(Boolean)
      .join(', ');
    return latitude === null || longitude === null
      ? []
      : [
          {
            id,
            name: title,
            position: [latitude, longitude],
            price: price?.perNight,
            currency: price?.currency,
            startingPriceUnitType: price?.starting ? price.unitType : undefined,
            priceGuests: price && !price.starting ? priceGuests : undefined,
            rating: reviews.rating,
            reviewCount: reviews.count,
            typeName: typeNames.get(listing.listing_type_id),
            address,
            description: listing.description ?? undefined,
            image: listing.main_picture,
            href: `/listings/${id}?${listingParams}&selected_id=${id}`,
          },
        ];
  });

const getCenter = (hotels: MapHotel[]): MapPosition | undefined => {
  if (!hotels.length) {
    return undefined;
  }
  return FALLBACK_CENTER;
};

const buildSearchParams = (options: {
  stay: Stay;
  destination: string;
  locationIds?: number[];
  tab?: string | null;
  sort?: SearchSort | null;
  distance?: SearchDistance;
  selectedId?: string;
  poiCategories?: PoiCategory[];
}) => {
  const params = toStayParams(options.stay);
  if (options.destination) {
    params.set('query', options.destination);
  }
  if (options.locationIds && options.locationIds.length > 0) {
    params.set('location_ids', options.locationIds.join(','));
  }
  if (options.tab) {
    params.set('tab', options.tab);
  }
  if (options.sort?.price) {
    params.set('sort_price', options.sort.price);
  }
  if (options.sort?.rating) {
    params.set('sort_rating', options.sort.rating);
  }
  if (options.distance && options.distance !== 'any') {
    params.set('distance', options.distance);
  }
  if (options.selectedId) {
    params.set('selected_id', options.selectedId);
  }
  if (
    options.poiCategories !== undefined &&
    options.poiCategories.length !== ALL_POI_CATEGORIES.length
  ) {
    params.set(
      'poi_categories',
      options.poiCategories.length ? options.poiCategories.join(',') : 'none'
    );
  }
  return params;
};

export const useController = (
  destination: string,
  stay: Stay,
  urlLocationIds: number[],
  guestsExplicit: boolean,
  initialTab?: string | null,
  initialSort?: SearchSort | null,
  initialDistance?: SearchDistance,
  initialSelectedId?: string,
  initialPoiCategories?: PoiCategory[]
) => {
  const router = useRouter();
  const [tab, setTab] = useState<string | null>(initialTab ?? null);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialSelectedId);
  const [sort, setSort] = useState<SearchSort | null>(initialSort ?? null);
  const [distance, setDistance] = useState<SearchDistance>(initialDistance ?? 'any');
  const [poiCategories, setPoiCategories] = useState<PoiCategory[]>(
    initialPoiCategories ?? ALL_POI_CATEGORIES
  );
  const [area, setArea] = useState<SearchArea>();

  useEffect(() => {
    if (initialTab !== undefined) {
      setTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialSort !== undefined) {
      setSort(initialSort);
    }
  }, [initialSort?.price, initialSort?.rating]);

  useEffect(() => {
    if (initialDistance !== undefined) {
      setDistance(initialDistance);
    }
  }, [initialDistance]);

  useEffect(() => {
    if (initialSelectedId !== undefined) {
      setSelectedId(initialSelectedId);
    }
  }, [initialSelectedId]);

  const initialPoiCategoriesKey = initialPoiCategories?.join(',');
  useEffect(() => {
    if (initialPoiCategories !== undefined) {
      setPoiCategories(initialPoiCategories);
    }
  }, [initialPoiCategoriesKey]);

  const search = useListingsSearch(
    destination,
    tab,
    stay,
    sort,
    urlLocationIds,
    guestsExplicit,
    area,
    distance
  );

  const effectiveCheckin = search.effectiveStay.checkin;
  const effectiveCheckout = search.effectiveStay.checkout;
  const effectiveAdults = search.effectiveStay.guests.adults;
  const effectiveChildren = search.effectiveStay.guests.children;
  const effectivePets = search.effectiveStay.guests.pets;

  const locationNames = search.locationIds.map(
    (id) => search.dictionaries.data?.locations.find((location) => location.id === id)?.name
  );
  const displayDestination = destination || locationNames.filter(Boolean).join(', ');
  const resolvedIds = search.locationIds.join(',');
  const urlIds = urlLocationIds.join(',');

  const buildCurrentSearchParams = (overrides?: {
    tab?: string | null;
    sort?: SearchSort | null;
    distance?: SearchDistance;
    selectedId?: string;
    poiCategories?: PoiCategory[];
  }) => {
    const nextTab = overrides && 'tab' in overrides ? overrides.tab : tab;
    const nextSort = overrides && 'sort' in overrides ? overrides.sort : sort;
    const nextDistance = overrides && 'distance' in overrides ? overrides.distance : distance;
    const nextSelectedId =
      overrides && 'selectedId' in overrides ? overrides.selectedId : selectedId;
    const nextPoiCategories =
      overrides && 'poiCategories' in overrides ? overrides.poiCategories : poiCategories;

    const locIds = search.locationIds.length ? search.locationIds : urlLocationIds;
    return buildSearchParams({
      stay: {
        checkin: effectiveCheckin,
        checkout: effectiveCheckout,
        guests: { adults: effectiveAdults, children: effectiveChildren, pets: effectivePets },
      },
      destination,
      locationIds: locIds,
      tab: nextTab,
      sort: nextSort,
      distance: nextDistance,
      selectedId: nextSelectedId,
      poiCategories: nextPoiCategories,
    });
  };

  const updateUrl = (overrides?: {
    tab?: string | null;
    sort?: SearchSort | null;
    distance?: SearchDistance;
    selectedId?: string;
    poiCategories?: PoiCategory[];
  }) => {
    if (typeof window === 'undefined') {
      return;
    }
    const params = buildCurrentSearchParams(overrides);
    const nextHref = `/search?${params}`;
    if (`${window.location.pathname}${window.location.search}` !== nextHref) {
      window.history.replaceState(window.history.state, '', nextHref);
    }
  };

  useEffect(() => {
    if (!search.lookupReady || !resolvedIds) {
      return;
    }

    // После мягкой навигации серверные props могут на один рендер отставать от адресной строки.
    // Сверяемся также с фактическим URL, чтобы не заменять страницу тем же самым адресом по кругу.
    const currentParams = new URLSearchParams(window.location.search);
    if (resolvedIds === urlIds || currentParams.get('location_ids') === resolvedIds) {
      return;
    }
    const params = buildCurrentSearchParams();
    params.set('location_ids', resolvedIds);
    const nextHref = `/search?${params}`;
    if (`${window.location.pathname}${window.location.search}` !== nextHref) {
      router.replace(nextHref, { scroll: false });
    }
  }, [
    destination,
    resolvedIds,
    router,
    search.lookupReady,
    effectiveCheckin,
    effectiveCheckout,
    effectiveAdults,
    effectiveChildren,
    effectivePets,
    urlIds,
    tab,
    sort?.price,
    sort?.rating,
    distance,
    selectedId,
    poiCategories,
  ]);

  const poiCategoriesKey = poiCategories.join(',');
  const priceGuests = search.nights ? formatGuestsForPrice(search.effectiveStay.guests) : undefined;
  const hotels = useMemo(() => {
    const dictionaries = search.dictionaries.data;
    const typeNames = new Map(
      (dictionaries?.listing_types ?? []).map((type) => [type.id, type.name])
    );
    const locationNames = new Map(
      (dictionaries?.locations ?? []).map((location) => [location.id, location.name])
    );
    const locIds = search.locationIds.length ? search.locationIds : urlLocationIds;
    const listingParams = buildSearchParams({
      stay: {
        checkin: effectiveCheckin,
        checkout: effectiveCheckout,
        guests: { adults: effectiveAdults, children: effectiveChildren, pets: effectivePets },
      },
      destination,
      locationIds: locIds,
      tab,
      sort,
      distance,
      poiCategories,
    });
    return toMapHotels(search.items, priceGuests, typeNames, locationNames, listingParams);
  }, [
    search.items,
    search.dictionaries.data,
    priceGuests,
    destination,
    effectiveCheckin,
    effectiveCheckout,
    effectiveAdults,
    effectiveChildren,
    effectivePets,
    resolvedIds,
    urlIds,
    tab,
    sort?.price,
    sort?.rating,
    distance,
    poiCategoriesKey,
  ]);

  // Центр фиксируем по первой выдаче направления: смена центра пересоздаёт карту,
  // а на переключение вкладки хватает подгонки масштаба под отели.
  const [centered, setCentered] = useState<{ destination: string; center: MapPosition }>();
  const hotelsCenter = getCenter(hotels);
  if (hotelsCenter && centered?.destination !== displayDestination) {
    setCentered({ destination: displayDestination, center: hotelsCenter });
  }
  const centerReady = centered?.destination === displayDestination;
  const center = centerReady ? centered.center : FALLBACK_CENTER;

  // Первая выдача направления пустая — центр города берём из геокодера, а не из отелей.
  const needsGeocode =
    Boolean(displayDestination) &&
    !centerReady &&
    !hotelsCenter &&
    search.requestKey !== 'skipped' &&
    !search.isLoading;
  useEffect(() => {
    if (!needsGeocode) {
      return;
    }
    const controller = new AbortController();
    const setCenter = (position = FALLBACK_CENTER) => {
      setCentered({ destination: displayDestination, center: position });
    };
    geocode(displayDestination, FALLBACK_CENTER, controller.signal)
      .then((result) => setCenter(result?.position))
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error(error);
          setCenter();
        }
      });
    return () => controller.abort();
  }, [needsGeocode, displayDestination]);

  // Пока грузится выдача новой вкладки или сортировки, держим на карте прежние отели:
  // иначе пустой список прячет карту, и она пересоздаётся с нуля, заново грузя подложку.
  const [shown, setShown] = useState<{ destination: string; hotels: MapHotel[] }>();
  const keepShown = search.isLoading && shown?.destination === displayDestination;
  if (!keepShown && (shown?.hotels !== hotels || shown.destination !== displayDestination)) {
    setShown({ destination: displayDestination, hotels });
  }
  const mapHotels = keepShown ? shown.hotels : hotels;

  const mapData = useMemo<SearchMapData>(
    () => ({
      city: displayDestination,
      center,
      hotels: mapHotels,
      points: [],
      districts: [],
    }),
    [displayDestination, center, mapHotels]
  );

  const handleTabChange = (next: string) => {
    setTab(next);
    setSelectedId(undefined);
    updateUrl({ tab: next, selectedId: undefined });
  };
  const handleSortChange = (next: SearchSort) => {
    setSort(next);
    setSelectedId(undefined);
    updateUrl({ sort: next, selectedId: undefined });
  };
  const handleDistanceChange = (next: SearchDistance) => {
    setDistance(next);
    setSelectedId(undefined);
    updateUrl({ distance: next, selectedId: undefined });
  };
  const handleSelect = (id?: string) => {
    setSelectedId(id);
    updateUrl({ selectedId: id });
  };
  const handlePoiCategoriesChange = (next: PoiCategory[]) => {
    setPoiCategories(next);
    updateUrl({ poiCategories: next });
  };

  return {
    tab: search.activeTab,
    sort: search.activeSort,
    distance,
    poiCategories,
    search,
    displayDestination,
    mapData,
    // Карта стоит на месте и при пустой выдаче, чтобы раскладка страницы не прыгала;
    // при поиске по области — ещё и чтобы пустую выдачу можно было поправить точками.
    showMap: Boolean(area) || (search.hasDestination && !search.destinationNotFound),
    // Пока центр не известен, вместо карты заглушка: смена центра пересоздала бы карту.
    mapReady: Boolean(area) || centerReady,
    selectedId,
    handleAreaChange: setArea,
    handleTabChange,
    handleSortChange,
    handleDistanceChange,
    handlePoiCategoriesChange,
    handleSelect,
  };
};
