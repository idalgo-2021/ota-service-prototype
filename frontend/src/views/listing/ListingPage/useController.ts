import { skipToken } from '@reduxjs/toolkit/query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import {
  useCreateBookingMutation,
  useGetAvailableUnitsQuery,
  useGetDictionariesQuery,
  useGetListingQuery,
  type Guests,
} from '@/lib/api';
import { useAppSelector } from '@/lib/hooks';
import { buildProfileHref, getCurrentProfileReturnTo } from '@/lib/profileNavigation';
import { getNights, toStayParams, type Stay } from '@/lib/stay';
import type { DateRangeValue } from '@/shared/date-range-picker';
import { useCart } from '@/views/marketplace/useCart';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import { LISTING_MAP_ID } from '../ListingMap';
import { getShortage } from '../units';

// Бэкенд пишет ошибки по-английски для разработчиков, поэтому гостю объясняем по коду ответа.
const getBookingError = (error: unknown) => {
  const status = (error as FetchBaseQueryError | undefined)?.status;
  if (status === 409) {
    return 'Пока вы выбирали, часть вариантов заняли. Выберите другие.';
  }
  if (status === 401) {
    return 'Сессия закончилась. Войдите снова, чтобы забронировать.';
  }
  return 'Не удалось забронировать. Попробуйте еще раз.';
};

export type SearchFiltersParams = {
  query?: string;
  location_ids?: string;
  tab?: string;
  sort_price?: string;
  sort_rating?: string;
  distance?: string;
  selected_id?: string;
  poi_categories?: string;
};

export const useController = (
  id: string,
  initialStay: Stay,
  searchFilters?: SearchFiltersParams
) => {
  const router = useRouter();
  const [stay, setStay] = useState(initialStay);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mapOpen, setMapOpen] = useState(false);
  const unitsRef = useRef<HTMLDivElement>(null);
  const [unitScroll, setUnitScroll] = useState({ left: false, right: false });
  const isSignedIn = useAppSelector((state) => !!state.auth.accessToken);
  const authRestored = useAppSelector((state) => state.auth.restored);

  const { lang, ready: languageReady } = useCatalogLanguage();
  const listing = useGetListingQuery(languageReady ? { id, lang } : skipToken);
  const dictionaries = useGetDictionariesQuery(languageReady ? lang : skipToken);
  const nights = getNights(stay.checkin, stay.checkout);
  const units = useGetAvailableUnitsQuery(
    languageReady && stay.checkin && nights
      ? { listingId: id, checkInDate: stay.checkin, nights, pets: stay.guests.pets, lang }
      : skipToken
  );
  const [createBooking, bookingState] = useCreateBookingMutation();
  // Одна корзина на страницу: её меняет витрина, а показывает и оформляет сводка поездки.
  const cart = useCart();

  // Направление поиска и параметры отбора храним в адресе рядом с поездкой, чтобы вернуться к той же выдаче.
  const toQueryParams = (next: Stay) => {
    const params = toStayParams(next);
    if (searchFilters?.query !== undefined) {
      params.set('query', searchFilters.query);
    }
    if (searchFilters?.location_ids) {
      params.set('location_ids', searchFilters.location_ids);
    }
    if (searchFilters?.tab) {
      params.set('tab', searchFilters.tab);
    }
    if (searchFilters?.sort_price) {
      params.set('sort_price', searchFilters.sort_price);
    }
    if (searchFilters?.sort_rating) {
      params.set('sort_rating', searchFilters.sort_rating);
    }
    if (searchFilters?.distance) {
      params.set('distance', searchFilters.distance);
    }
    if (searchFilters?.selected_id) {
      params.set('selected_id', searchFilters.selected_id);
    }
    if (searchFilters?.poi_categories !== undefined) {
      params.set('poi_categories', searchFilters.poi_categories);
    }
    return params;
  };

  // Поездка живёт и в адресе: ссылкой можно поделиться, а «назад» вернёт к поиску с ней же.
  // Другие даты или гости меняют список свободных номеров, поэтому выбор сбрасываем.
  const updateStay = (next: Stay) => {
    setStay(next);
    setSelectedIds([]);
    unitsRef.current?.scrollTo({ left: 0 });
    bookingState.reset();
    router.replace(`/listings/${id}?${toQueryParams(next)}`, { scroll: false });
  };

  const handleDatesChange = ({ from, to }: DateRangeValue) => {
    updateStay({ ...stay, checkin: from, checkout: to });
  };
  const handleGuestsChange = (guests: Guests) => {
    updateStay({ ...stay, guests });
  };

  const handleToggleUnit = (unitId: string) => {
    bookingState.reset();
    setSelectedIds((prev) =>
      prev.includes(unitId) ? prev.filter((selected) => selected !== unitId) : [...prev, unitId]
    );
  };

  const availableUnits = units.data ?? [];
  const updateUnitScroll = useCallback(() => {
    const list = unitsRef.current;
    if (!list) {
      return;
    }
    setUnitScroll({
      left: list.scrollLeft > 2,
      right: list.scrollLeft + list.clientWidth < list.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const list = unitsRef.current;
    if (!list) {
      return;
    }
    const observer = new ResizeObserver(updateUnitScroll);
    observer.observe(list);
    updateUnitScroll();
    return () => observer.disconnect();
  }, [availableUnits.length, updateUnitScroll]);

  const handleScrollUnits = (direction: -1 | 1) => {
    const list = unitsRef.current;
    if (!list) {
      return;
    }
    list.scrollBy({ left: direction * list.clientWidth * 0.85, behavior: 'smooth' });
  };
  const selectedUnits = availableUnits.filter((unit) => selectedIds.includes(unit.id));
  const shortage = getShortage(selectedUnits, stay.guests);
  const pricePerNight = selectedUnits.reduce((sum, unit) => sum + Number(unit.price_per_night), 0);
  const currency = selectedUnits[0]?.currency ?? availableUnits[0]?.currency;
  const fits = selectedUnits.length > 0 && !shortage.adults && !shortage.children;

  const handleBook = async () => {
    if (!stay.checkin || !nights || !fits) {
      return;
    }
    const result = await createBooking({
      listingId: id,
      unitIds: selectedIds,
      checkInDate: stay.checkin,
      nights,
      guests: stay.guests,
    });
    if (!result.data) {
      return;
    }
    router.push(
      buildProfileHref({
        tab: 'bookings',
        created: result.data.id,
        returnTo: getCurrentProfileReturnTo(),
      })
    );
  };

  const typeName = dictionaries.data?.listing_types.find(
    (type) => type.id === listing.data?.listing_type_id
  )?.name;
  const locationName = dictionaries.data?.locations.find(
    (location) => location.id === listing.data?.location_id
  )?.name;

  // Пришли не из поиска (например, по ссылке или из своих броней) — ведём к выдаче по городу
  // объекта, а пока справочник не загрузился, ссылку не показываем.
  const backQuery = searchFilters?.query ?? locationName;
  const backParams = toQueryParams(stay);
  if (backQuery !== undefined && !searchFilters?.query) {
    backParams.set('query', backQuery);
  }

  // Галерея: главное фото первым, за ним фото объекта по порядку, без повторов.
  const images = listing.data
    ? [
        ...new Set(
          [
            listing.data.main_picture,
            ...[...(listing.data.images ?? [])]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((image) => image.url),
          ].filter((url): url is string => Boolean(url))
        ),
      ]
    : [];

  // Без координат объект на карте не показать — тогда нет ни блока, ни кнопки к нему.
  const position =
    listing.data?.latitude != null && listing.data.longitude != null
      ? { latitude: listing.data.latitude, longitude: listing.data.longitude }
      : undefined;

  // На узком экране карта открывается поверх страницы, на широком — переход к блоку справа.
  const handleShowMap = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      event.preventDefault();
      setMapOpen(true);
      return;
    }
    const target = document.getElementById(LISTING_MAP_ID);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return {
    lang,
    images,
    position,
    handleShowMap,
    mapOpen,
    openMap: () => setMapOpen(true),
    closeMap: () => setMapOpen(false),
    backHref: backQuery !== undefined ? `/search?${backParams}` : undefined,
    listing: listing.data,
    listingError: listing.isError,
    typeName,
    locationName,
    stay,
    nights,
    // Экскурсии на витрине предлагаем в дни поездки, если даты уже выбраны.
    trip:
      stay.checkin && stay.checkout && nights
        ? { from: stay.checkin, to: stay.checkout }
        : undefined,
    units: availableUnits,
    unitsRef,
    unitScroll,
    updateUnitScroll,
    handleScrollUnits,
    unitsLoading: units.isFetching,
    unitsError: units.isError,
    selectedIds,
    selectedUnits,
    shortage,
    fits,
    total: nights ? pricePerNight * nights : 0,
    currency,
    isSignedIn,
    authRestored,
    cart,
    bookingPending: bookingState.isLoading,
    bookingError: bookingState.isError ? getBookingError(bookingState.error) : undefined,
    handleDatesChange,
    handleGuestsChange,
    handleToggleUnit,
    handleBook,
  };
};
