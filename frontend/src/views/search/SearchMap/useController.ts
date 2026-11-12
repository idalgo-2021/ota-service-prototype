import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type SubmitEvent,
} from 'react';
import { AREA_RADIUS_DEFAULT, AREA_RADIUS_STEP, getAreaError } from './area';
import { fetchBoundary, geocode, type GeocodeResult } from './geocode';
import type { SearchMapProps } from './SearchMap';
import { suggestPlaces } from './suggest';
import type {
  MapDistrict,
  MapHotel,
  MapPoint,
  MapPosition,
  SearchArea,
  SearchSuggestion,
} from './types';

/** Пауза после ввода перед запросом подсказок, чтобы не слать запрос на каждую букву. */
const SUGGEST_DELAY = 500;
/** С какой длины запроса спрашивать подсказки у геокодера. */
const SUGGEST_MIN_LENGTH = 2;
/** Сколько совпадений среди отелей и точек на карте показывать над подсказками геокодера. */
const MAP_SUGGESTIONS_LIMIT = 3;

/**
 * Старые браузеры и некоторые встроенные WebView не реализуют randomUUID,
 * хотя сам Web Crypto API у них есть. Точка на карте не должна зависеть от
 * этого необязательного метода: ей нужен только стабильный уникальный ключ
 * для React и удаления маркера.
 */
const createPointId = () => {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `point-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const filterByName = (items: (MapPoint | MapHotel)[], query: string) => {
  const text = query.trim().toLocaleLowerCase('ru');
  if (!text) {
    return [];
  }

  return items.filter((item) => item.name.toLocaleLowerCase('ru').includes(text));
};

export const useController = ({
  data,
  selectedHotelId,
  onPointsChange,
  onDistrictsChange,
  onHotelSelect,
  onAreaChange,
}: SearchMapProps) => {
  const [points, setPoints] = useState(data.points || []);
  const [districtIds, setDistrictIds] = useState(data.selectedDistrictIds ?? []);
  // Районы, найденные через поиск: их границы загружены из геокодера, а не пришли в данных.
  const [addedDistricts, setAddedDistricts] = useState<MapDistrict[]>([]);
  const [focusPosition, setFocusPosition] = useState<MapPosition>();
  const [focusBounds, setFocusBounds] = useState<MapPosition[]>();
  const [addingPoint, setAddingPoint] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<GeocodeResult>();
  const searchAbortRef = useRef<AbortController>(undefined);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const suggestAbortRef = useRef<AbortController>(undefined);
  const [prevSelectedHotelId, setPrevSelectedHotelId] = useState(selectedHotelId);
  // Отель, выбранный кликом по самой карте: к нему не подлетаем, он и так на виду.
  const [clickedHotelId, setClickedHotelId] = useState<string>();
  const [areaEnabled, setAreaEnabled] = useState(false);
  const [areaRadius, setAreaRadius] = useState(AREA_RADIUS_DEFAULT);
  // Значение ползунка во время перетаскивания: поиск запускаем, только когда его отпустили.
  const [areaRadiusDraft, setAreaRadiusDraft] = useState(AREA_RADIUS_DEFAULT);

  const areaPositions = useMemo(() => points.map((point) => point.position), [points]);
  const areaError = getAreaError(areaPositions);
  // Одна точка без расширения — это пустая область, поэтому вокруг неё радиус не меньше шага.
  const areaMinRadius = areaPositions.length === 1 ? AREA_RADIUS_STEP : 0;
  const area = useMemo<SearchArea | undefined>(
    () =>
      areaEnabled && areaPositions.length && !areaError
        ? { points: areaPositions, radiusM: Math.max(areaRadius, areaMinRadius) }
        : undefined,
    [areaEnabled, areaPositions, areaError, areaRadius, areaMinRadius]
  );

  useEffect(() => {
    onAreaChange?.(area);
  }, [area, onAreaChange]);

  useEffect(
    () => () => {
      searchAbortRef.current?.abort();
      suggestAbortRef.current?.abort();
      clearTimeout(suggestTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!expanded) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    };

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expanded]);

  // Новый массив на каждый вызов, чтобы повторный фокус на ту же точку снова сработал.
  const focusOn = (position: MapPosition) => {
    setFocusPosition([...position]);
  };

  const focusOnArea = (positions: MapPosition[]) => {
    setFocusBounds([...positions]);
  };

  // Стабильная ссылка, иначе карта перерисовывала бы полигоны на каждый рендер.
  const allDistricts = useMemo(
    () => [...data.districts, ...addedDistricts],
    [data.districts, addedDistricts]
  );

  // Отель выбрали снаружи (например, в списке) — показываем его на карте.
  if (selectedHotelId !== prevSelectedHotelId) {
    setPrevSelectedHotelId(selectedHotelId);
    const hotel = data.hotels.find(({ id }) => id === selectedHotelId);
    if (hotel && hotel.id !== clickedHotelId) {
      focusOn(hotel.position);
    }
    setClickedHotelId(undefined);
  }

  const updatePoints = (next: MapPoint[]) => {
    setPoints(next);
    onPointsChange?.(next);
  };

  const updateDistrictIds = (next: string[]) => {
    setDistrictIds(next);
    onDistrictsChange?.(next);
  };

  const handleToggleDistrict = (id: string) => {
    updateDistrictIds(
      districtIds.includes(id)
        ? districtIds.filter((districtId) => districtId !== id)
        : [...districtIds, id]
    );
  };

  const handleRemoveDistrict = (id: string) => {
    setAddedDistricts(addedDistricts.filter((district) => district.id !== id));
    updateDistrictIds(districtIds.filter((districtId) => districtId !== id));
  };

  const handleAddPoint = (position: MapPosition, name = `Мое место ${points.length + 1}`) => {
    if (points.length === 0) {
      setAreaEnabled(true);
    }
    updatePoints([...points, { id: createPointId(), name, position }]);
    setAddingPoint(false);
  };

  const handleAddSearchResult = () => {
    if (!searchResult) {
      return;
    }
    handleAddPoint(searchResult.position, searchResult.name);
    setSearchResult(undefined);
  };

  const handleRemovePoint = (id: string) => {
    updatePoints(points.filter((point) => point.id !== id));
  };

  const handleHotelSelect = (id: string) => {
    setClickedHotelId(id);
    onHotelSelect?.(id);
  };

  const handleToggleExpanded = () => {
    setExpanded(!expanded);
  };

  const handleToggleAdding = () => {
    setAddingPoint(!addingPoint);
  };

  const cancelSuggestions = () => {
    clearTimeout(suggestTimerRef.current);
    suggestAbortRef.current?.abort();
  };

  const closeSuggestions = () => {
    cancelSuggestions();
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
  };

  // Совпадения на карте показываем сразу, подсказки геокодера — после паузы в наборе.
  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setQuery(value);
    cancelSuggestions();
    setActiveSuggestionIndex(-1);

    const mapSuggestions = filterByName([...points, ...data.hotels], value)
      .slice(0, MAP_SUGGESTIONS_LIMIT)
      .map(({ id, name, position }) => ({
        id: `map-${id}`,
        name,
        position,
        kind: 'map' as const,
      }));
    setSuggestions(mapSuggestions);

    const text = value.trim();
    if (text.length < SUGGEST_MIN_LENGTH) {
      return;
    }

    suggestTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      suggestAbortRef.current = controller;

      try {
        const places = await suggestPlaces(text, data.center, controller.signal);
        setSuggestions([
          ...mapSuggestions,
          ...places.map((place, index) => ({
            ...place,
            id: `place-${index}`,
            kind: place.areaId ? ('district' as const) : ('place' as const),
          })),
        ]);
      } catch (error) {
        // Без подсказок поиск по Enter всё равно работает, поэтому пользователю ничего не пишем.
        if (!controller.signal.aborted) {
          console.error(error);
        }
      }
    }, SUGGEST_DELAY);
  };

  // Район уже на карте — просто выделяем его, иначе сначала загружаем границы.
  const selectDistrict = async (name: string, position: MapPosition, areaId: string) => {
    const id = `osm-${areaId}`;
    const select = (positions: MapPosition[][]) => {
      if (!districtIds.includes(id)) {
        updateDistrictIds([...districtIds, id]);
      }
      focusOnArea(positions[0]);
    };

    const known = allDistricts.find((district) => district.id === id);
    if (known) {
      select(known.positions);
      return;
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearching(true);

    try {
      const positions = await fetchBoundary(areaId, controller.signal);
      if (positions) {
        setAddedDistricts((current) => [...current, { id, name, positions }]);
        select(positions);
      } else {
        focusOn(position);
        setSearchMessage('Границы района не нашлись — показываем его центр.');
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      console.error(error);
      focusOn(position);
      setSearchMessage('Не удалось загрузить границы района — показываем его центр.');
    } finally {
      if (searchAbortRef.current === controller) {
        setSearching(false);
      }
    }
  };

  const handleSelectSuggestion = ({
    name,
    address = '',
    position,
    kind,
    areaId,
  }: SearchSuggestion) => {
    closeSuggestions();
    searchAbortRef.current?.abort();
    setSearching(false);
    setQuery(name);
    setSearchMessage('');
    setSearchResult(kind === 'place' ? { name, address, position } : undefined);
    if (kind === 'district' && areaId) {
      selectDistrict(name, position, areaId);
    } else {
      focusOn(position);
    }
  };

  // Стрелки двигаются по подсказкам по кругу, Escape закрывает список, не сворачивая карту.
  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      // Позиции: -1 (курсор в поле ввода) и индексы подсказок.
      const positions = suggestions.length + 1;
      setActiveSuggestionIndex(((activeSuggestionIndex + 1 + step + positions) % positions) - 1);
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      closeSuggestions();
    }
  };

  const handleSearchBlur = () => {
    closeSuggestions();
  };

  // Сначала ищем среди того, что уже на карте, и только потом — адрес через геокодер.
  // Если в списке выбрана подсказка, Enter выбирает её.
  const handleSearch = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const activeSuggestion = suggestions[activeSuggestionIndex];
    if (activeSuggestion) {
      handleSelectSuggestion(activeSuggestion);
      return;
    }

    closeSuggestions();
    if (!query.trim()) {
      return;
    }

    searchAbortRef.current?.abort();
    setSearchResult(undefined);
    setSearchMessage('');

    const [match] = filterByName([...points, ...data.hotels], query);
    if (match) {
      focusOn(match.position);
      return;
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearching(true);

    try {
      const result = await geocode(query.trim(), data.center, controller.signal);
      if (result) {
        setSearchResult(result);
        focusOn(result.position);
      } else {
        setSearchMessage('Ничего не нашлось. Попробуйте уточнить название или адрес.');
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      console.error(error);
      setSearchMessage('Поиск адреса сейчас недоступен. Попробуйте позже.');
    } finally {
      if (searchAbortRef.current === controller) {
        setSearching(false);
      }
    }
  };

  const districts = allDistricts.map((district) => {
    const handleToggle = () => {
      handleToggleDistrict(district.id);
    };
    const handleRemove = () => {
      handleRemoveDistrict(district.id);
    };
    // Убрать можно только найденные районы: районы из данных всегда остаются в легенде.
    const added = addedDistricts.includes(district);
    return {
      ...district,
      selected: districtIds.includes(district.id),
      handleToggle,
      handleRemove: added ? handleRemove : undefined,
    };
  });

  const legendPoints = points.map((point) => {
    const handleFocus = () => {
      focusOn(point.position);
    };
    return { ...point, handleFocus };
  });

  const handleToggleArea = () => {
    setAreaEnabled(!areaEnabled);
  };

  const handleAreaRadiusChange = (radius: number) => {
    setAreaRadiusDraft(radius);
  };

  const handleAreaRadiusCommit = (radius: number) => {
    setAreaRadiusDraft(radius);
    setAreaRadius(radius);
  };

  const searchSuggestions = suggestions.map((suggestion, index) => {
    const handleSelect = () => {
      handleSelectSuggestion(suggestion);
    };
    return { ...suggestion, active: index === activeSuggestionIndex, handleSelect };
  });

  const getHint = () => {
    if (addingPoint) {
      return 'Нажмите на карту, чтобы добавить место';
    }
    if (searching) {
      return 'Ищем…';
    }
    return searchMessage;
  };

  const handleClearPoints =  useCallback(() => {
    setPoints([]);
  }, []);

  return {
    points,
    districtIds,
    allDistricts,
    focusPosition,
    focusBounds,
    addingPoint,
    expanded,
    query,
    hint: getHint(),
    searching,
    searchResult,
    searchSuggestions,
    districts,
    legendPoints,
    area,
    legendArea: {
      enabled: areaEnabled,
      singlePoint: areaPositions.length === 1,
      minRadius: areaMinRadius,
      radius: Math.max(areaRadiusDraft, areaMinRadius),
      error: areaEnabled ? areaError : undefined,
      handleToggle: handleToggleArea,
      handleRadiusChange: handleAreaRadiusChange,
      handleRadiusCommit: handleAreaRadiusCommit,
    },
    handleToggleExpanded,
    handleToggleAdding,
    handleQueryChange,
    handleSearchKeyDown,
    handleSearchBlur,
    handleSearch,
    handleAddPoint,
    handleAddSearchResult,
    handleRemovePoint,
    handleToggleDistrict,
    handleHotelSelect,
    handleClearPoints,
  };
};
