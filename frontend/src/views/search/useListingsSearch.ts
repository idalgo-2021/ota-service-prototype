import { skipToken } from '@reduxjs/toolkit/query';
import { useMemo } from 'react';
import {
  CURRENCY,
  type Dictionaries,
  type Listing,
  type SearchListing,
  type SearchListingsParams,
  type UnitType,
  useGetDictionariesQuery,
  useSearchListingsQuery,
} from '@/lib/api';
import { getNights, type Stay } from '@/lib/stay';
import type { SearchArea } from './SearchMap';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import { DISTANCE_OPTIONS, type SearchDistance } from './distance';

export const ALL_TAB = 'all';
export const PROFILE_TAB = 'profile';
export type SearchSort = NonNullable<SearchListingsParams['sort']>;

export type SearchItem = {
  listing: Listing;
  price?: { perNight: number; currency: string; unitType: UnitType; starting: boolean };
};

const normalize = (text: string) => text.trim().toLocaleLowerCase();

/** Свободный ввод направления ищем по русским и английским названиям справочника. */
const findLocationIds = (dictionaries: Dictionaries[], destination: string) => {
  const query = normalize(destination);
  const ids = new Set<number>();
  for (const dictionary of dictionaries) {
    const matches = (name: string) => {
      const text = normalize(name);
      return Boolean(text) && (text.includes(query) || query.includes(text));
    };
    const countryIds = new Set(
      dictionary.countries.filter((country) => matches(country.name)).map((country) => country.id)
    );
    for (const location of dictionary.locations) {
      if (matches(location.name) || countryIds.has(location.country_id)) {
        ids.add(location.id);
      }
    }
  }
  return [...ids].sort((a, b) => a - b);
};

const toSearchItem = ({ listing, lowest_price_options }: SearchListing): SearchItem => {
  const cheapest = (lowest_price_options ?? []).reduce<
    NonNullable<SearchListing['lowest_price_options']>[number] | undefined
  >(
    (best, option) =>
      !best || Number(option.total_price_per_night) < Number(best.total_price_per_night)
        ? option
        : best,
    undefined
  );
  return {
    listing,
    price: cheapest
      ? {
          perNight: Number(cheapest.total_price_per_night),
          currency: cheapest.currency,
          unitType: cheapest.type,
          starting: false,
        }
      : lowest_price_options === null && listing.starting_price
        ? {
            perNight: Number(listing.starting_price.amount),
            currency: listing.starting_price.currency,
            unitType: listing.starting_price.unit_type,
            starting: true,
          }
        : undefined,
  };
};

const EMPTY_ITEMS: SearchItem[] = [];

const checkoutFromPreference = (checkin?: string, nights?: number) => {
  if (!checkin || !nights || nights < 1 || nights > 365) {
    return undefined;
  }
  const start = Date.parse(`${checkin}T00:00:00Z`);
  return Number.isFinite(start)
    ? new Date(start + nights * 86_400_000).toISOString().slice(0, 10)
    : undefined;
};

/**
 * Полная выборка снабжает карту; список раскрывает карточки порциями на клиенте.
 * Если задана область по точкам на карте, ищем только в ней, без направления.
 */
export const useListingsSearch = (
  destination: string,
  tab: string | null,
  stay: Stay,
  sort: SearchSort | null,
  urlLocationIds: number[],
  guestsExplicit: boolean,
  area?: SearchArea,
  distance: SearchDistance = 'any'
) => {
  const { lang, ready: languageReady, preferences } = useCatalogLanguage();
  const dictionaries = useGetDictionariesQuery(languageReady ? lang : skipToken);
  const otherLanguage = lang === 'ru' ? 'en' : 'ru';
  const alternateDictionaries = useGetDictionariesQuery(languageReady ? otherLanguage : skipToken);
  const hasDestinationText = Boolean(destination.trim());
  const lookupReady =
    Boolean(dictionaries.data) &&
    (Boolean(alternateDictionaries.data) || alternateDictionaries.isError);
  const resolvedLocationIds =
    hasDestinationText && lookupReady
      ? findLocationIds(
          [dictionaries.data, alternateDictionaries.data].filter((value): value is Dictionaries =>
            Boolean(value)
          ),
          destination
        )
      : [];
  const knownLocationIds = new Set(dictionaries.data?.locations.map((location) => location.id));
  const chosenLocationIds = urlLocationIds.length
    ? urlLocationIds
    : (preferences?.location_ids ?? []);
  const locationIds = (
    urlLocationIds.length
      ? urlLocationIds
      : hasDestinationText
        ? resolvedLocationIds
        : chosenLocationIds
  ).filter((id) => knownLocationIds.has(id));
  const hasDestination = hasDestinationText || chosenLocationIds.length > 0;
  const destinationNotFound = hasDestination && lookupReady && locationIds.length === 0;
  const checkout = stay.checkout ?? checkoutFromPreference(stay.checkin, preferences?.nights);
  const effectiveStay: Stay = {
    checkin: stay.checkin,
    checkout,
    guests:
      guestsExplicit || !preferences
        ? stay.guests
        : {
            adults: preferences.adults_count,
            children: preferences.children_count,
            pets: preferences.has_pets,
          },
  };
  const nights = getNights(effectiveStay.checkin, effectiveStay.checkout);
  const preferredTypeId = preferences?.listing_type_ids?.[0];
  const listingTypeIds =
    tab === ALL_TAB
      ? undefined
      : tab !== null
        ? tab === PROFILE_TAB && preferredTypeId
          ? [preferredTypeId]
          : [Number(tab)]
        : preferredTypeId
          ? [preferredTypeId]
          : undefined;
  const defaultSort: SearchSort = {
    ...(preferences?.listing_price_sort ? { price: preferences.listing_price_sort } : {}),
    ...(preferences?.listing_rating_sort ? { rating: preferences.listing_rating_sort } : {}),
  };
  const activeSort = sort ?? defaultSort;
  const distanceParams = DISTANCE_OPTIONS.find((option) => option.value === distance)?.params;
  const withPrices = Boolean(nights && effectiveStay.checkin);
  const place = area
    ? {
        geo: {
          points: area.points.map(([lat, lon]): [number, number] => [lon, lat]),
          radius_m: area.radiusM,
        },
      }
    : { location_ids: locationIds };

  const request: SearchListingsParams | typeof skipToken =
    languageReady && (area || (lookupReady && hasDestination && !destinationNotFound))
      ? withPrices
        ? {
            lang,
            availability_mode: 'for_guests',
            ...place,
            ...distanceParams,
            listing_type_ids: listingTypeIds,
            check_in_date: effectiveStay.checkin,
            nights,
            adults_count: effectiveStay.guests.adults,
            children_count: effectiveStay.guests.children,
            has_pets: effectiveStay.guests.pets,
            currency: CURRENCY,
            sort: activeSort,
          }
        : {
            lang,
            availability_mode: 'ignore',
            ...place,
            ...distanceParams,
            listing_type_ids: listingTypeIds,
            sort: activeSort,
          }
      : skipToken;
  const search = useSearchListingsQuery(request);
  const items = useMemo(
    () => search.currentData?.map(toSearchItem) ?? EMPTY_ITEMS,
    [search.currentData]
  );

  return {
    dictionaries,
    items,
    total: search.currentData?.length,
    requestKey: request === skipToken ? 'skipped' : JSON.stringify(request),
    isLoading: Boolean(request !== skipToken && !search.currentData && !search.isError),
    isPending:
      !languageReady ||
      dictionaries.isLoading ||
      (hasDestinationText && !lookupReady && !dictionaries.isError),
    isError: dictionaries.isError || search.isError,
    loadingDictionaries:
      languageReady && (dictionaries.isLoading || alternateDictionaries.isLoading),
    nights: withPrices ? nights : undefined,
    hasDestination,
    hasArea: Boolean(area),
    effectiveStay,
    activeSort,
    activeTab: tab ?? (preferredTypeId ? String(preferredTypeId) : ALL_TAB),
    hasProfileTypes: false,
    locationIds,
    lookupReady,
    destinationNotFound,
    lang,
  };
};
