import { useGetDictionariesQuery, type Guests } from '@/lib/api';
import { DEFAULT_GUESTS, toStayParams, type Stay } from '@/lib/stay';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import {
  getTodayIso,
  isValidBookingDateRange,
  normalizeBookingDateRange,
  type DateRangeValue,
} from '@/shared/date-range-picker';
import { useRouter } from 'next/navigation';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  type ChangeEvent,
  type KeyboardEvent,
  type SubmitEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

type CityOption = { id: number; name: string; country?: string };

export type SearchFormInitialValues = {
  destination: string;
  locationIds: number[];
  stay: Stay;
  guestsExplicit: boolean;
};

export const useController = (
  initialValues?: SearchFormInitialValues,
  onSubmitted?: () => void,
  onGuestsChange?: (guests: Guests) => void
) => {
  const router = useRouter();
  const destinationId = useId();
  const cityListId = useId();
  const datesId = useId();
  const guestsId = useId();
  const [query, setQuery] = useState(initialValues?.destination ?? '');
  const [cityFilter, setCityFilter] = useState('');
  const [selectedLocationIds, setSelectedLocationIds] = useState(initialValues?.locationIds ?? []);
  const [cityListOpen, setCityListOpen] = useState(false);
  const [activeCityIndex, setActiveCityIndex] = useState(-1);
  const [dates, setDates] = useState<DateRangeValue>(() =>
    normalizeBookingDateRange({
      from: initialValues?.stay.checkin,
      to: initialValues?.stay.checkout,
    })
  );
  const [guests, setGuests] = useState<Guests>(initialValues?.stay.guests ?? DEFAULT_GUESTS);
  const guestsTouched = useRef(initialValues?.guestsExplicit ?? false);
  const [locationTouchedState, setLocationTouchedState] = useState(
    Boolean(initialValues?.destination || initialValues?.locationIds.length)
  );
  const { lang, ready, preferences } = useCatalogLanguage();
  const dictionaries = useGetDictionariesQuery(ready ? lang : skipToken);
  const countryNames = new Map(
    dictionaries.data?.countries.map((country) => [country.id, country.name])
  );
  const savedLocationIds = preferences?.location_ids ?? [];
  const preferredLocations = savedLocationIds
    .map((id) => dictionaries.data?.locations.find((location) => location.id === id))
    .filter((location): location is NonNullable<typeof location> => Boolean(location));
  const preferredLocationIds = preferredLocations.map((location) => location.id);
  const preferredDestination = preferredLocations.map((location) => location.name).join(', ');
  const selectedDestination = selectedLocationIds
    .map((id) => dictionaries.data?.locations.find((location) => location.id === id)?.name)
    .filter((name): name is string => Boolean(name))
    .join(', ');
  const displayedQuery =
    query ||
    (locationTouchedState
      ? selectedDestination
      : preferredDestination || '');
  const cities: CityOption[] = (dictionaries.data?.locations ?? [])
    .map((location) => ({
      id: location.id,
      name: location.name,
      country: countryNames.get(location.country_id),
    }))
    .sort((a, b) => {
      const savedOrder =
        Number(savedLocationIds.includes(b.id)) - Number(savedLocationIds.includes(a.id));
      return savedOrder || a.name.localeCompare(b.name, lang);
    });
  const normalizedQuery = cityFilter.trim().toLocaleLowerCase();
  const cityOptions = normalizedQuery
    ? cities.filter((city) =>
        `${city.name} ${city.country ?? ''}`.toLocaleLowerCase().includes(normalizedQuery)
      )
    : cities;
  const showCityList = cityListOpen;
  const activeCity = showCityList ? cityOptions[activeCityIndex] : undefined;
  const cityListMessage =
    !ready || dictionaries.isLoading
      ? lang === 'en'
        ? 'Loading cities…'
        : 'Загружаем города…'
      : dictionaries.isError
        ? lang === 'en'
          ? 'Could not load cities'
          : 'Не удалось загрузить города'
        : lang === 'en'
          ? 'No city found'
          : 'Город не найден';
  useEffect(() => {
    if (preferences && !guestsTouched.current) {
      const preferredGuests = {
        adults: preferences.adults_count,
        children: preferences.children_count,
        pets: preferences.has_pets,
      };
      setGuests(preferredGuests);
      onGuestsChange?.(preferredGuests);
    }
  }, [onGuestsChange, preferences]);
  const savedLocations = (preferences?.location_ids ?? []).map(
    (id) => dictionaries.data?.locations.find((location) => location.id === id)?.name
  );
  const destinationPlaceholder = savedLocations.filter(Boolean).length
    ? `${lang === 'en' ? 'From your profile' : 'Из профиля'}: ${savedLocations.filter(Boolean).join(', ')}`
    : lang === 'en'
      ? 'Choose a city'
      : 'Выберите город';

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready) {
      return;
    }

    const today = getTodayIso();
    const validDates = isValidBookingDateRange(dates, today)
      ? dates
      : normalizeBookingDateRange(dates, today);
    if (validDates !== dates) {
      setDates(validDates);
    }

    const params = toStayParams({
      checkin: validDates.from,
      checkout: validDates.to,
      guests,
    });
    const destination = displayedQuery.trim();
    const locationIds = locationTouchedState ? selectedLocationIds : preferredLocationIds;
    if (destination) {
      params.set('query', destination);
    }
    if (locationIds.length) {
      params.set('location_ids', locationIds.join(','));
    }

    router.push(`/search?${params}`);
    onSubmitted?.();
  };

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setLocationTouchedState(true);
    setQuery(event.target.value);
    setCityFilter(event.target.value);
    setSelectedLocationIds([]);
    setCityListOpen(true);
    setActiveCityIndex(-1);
  };
  const handleClearQuery = () => {
    setLocationTouchedState(true);
    setQuery('');
    setCityFilter('');
    setSelectedLocationIds([]);
    setCityListOpen(true);
    setActiveCityIndex(-1);
  };
  const handleCitySelect = (city: CityOption) => {
    setLocationTouchedState(true);
    setQuery(city.name);
    setCityFilter('');
    setSelectedLocationIds([city.id]);
    setCityListOpen(false);
    setActiveCityIndex(-1);
  };
  const handleCityKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setCityListOpen(false);
      setActiveCityIndex(-1);
      return;
    }
    if (event.key === 'Enter' && showCityList && activeCity) {
      event.preventDefault();
      handleCitySelect(activeCity);
      return;
    }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && cityOptions.length) {
      event.preventDefault();
      setCityListOpen(true);
      setActiveCityIndex((current) =>
        event.key === 'ArrowDown'
          ? (current + 1) % cityOptions.length
          : current <= 0
            ? cityOptions.length - 1
            : current - 1
      );
    }
  };
  const handleGuestsChange = (value: Guests) => {
    guestsTouched.current = true;
    setGuests(value);
    onGuestsChange?.(value);
  };
  const handleDatesChange = (value: DateRangeValue) => {
    setDates(normalizeBookingDateRange(value));
  };

  return {
    lang,
    destinationId,
    cityListId,
    datesId,
    guestsId,
    query: displayedQuery,
    dates,
    guests,
    ready,
    destinationPlaceholder,
    cityOptions,
    cityListMessage,
    showCityList,
    activeCityIndex,
    activeCityId: activeCity?.id,
    setDates: handleDatesChange,
    setGuests: handleGuestsChange,
    handleQueryChange,
    handleClearQuery,
    handleCitySelect,
    handleCityKeyDown,
    handleCityFocus: () => setCityListOpen(true),
    handleCityBlur: () => setCityListOpen(false),
    handleSubmit,
  };
};
