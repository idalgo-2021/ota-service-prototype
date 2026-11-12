import type { MapPosition } from './types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/** Радиус области вокруг центра города, в градусах: результаты внутри неё в приоритете. */
const VIEWBOX_RADIUS = 0.3;

type NominatimPlace = {
  lat: string;
  lon: string;
  name: string;
  display_name: string;
};

export type GeocodeResult = {
  name: string;
  address: string;
  position: MapPosition;
};

/**
 * Ищет место по названию или адресу через Nominatim (OpenStreetMap).
 * Правила сервиса: не чаще 1 запроса в секунду и без автодополнения — поэтому ищем
 * только по отправке формы.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export const geocode = async (
  query: string,
  [lat, lng]: MapPosition,
  signal?: AbortSignal
): Promise<GeocodeResult | undefined> => {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    'accept-language': 'ru',
    viewbox: [
      lng - VIEWBOX_RADIUS,
      lat + VIEWBOX_RADIUS,
      lng + VIEWBOX_RADIUS,
      lat - VIEWBOX_RADIUS,
    ].join(','),
  });

  const response = await fetch(`${NOMINATIM_URL}?${params}`, { signal });
  if (!response.ok) {
    throw new Error(`Nominatim: ${response.status}`);
  }

  const [place]: NominatimPlace[] = await response.json();
  if (!place) {
    return undefined;
  }

  return {
    // Если у адресов нет name, тогда берём «дом, улица» из полного адреса.
    name: place.name || place.display_name.split(', ').slice(0, 2).join(', '),
    address: place.display_name,
    position: [Number(place.lat), Number(place.lon)],
  };
};

const NOMINATIM_LOOKUP_URL = 'https://nominatim.openstreetmap.org/lookup';

/** Допуск упрощения границы в градусах: ~10 м, у района остаётся несколько десятков вершин. */
const POLYGON_THRESHOLD = '0.0001';

type GeoJsonRing = [number, number][];

// Для района приходит Polygon или MultiPolygon, для точечных объектов — Point.
type NominatimBoundary = {
  geojson?: { type: string; coordinates: unknown };
};

// Площадь по формуле шнурка: годится, чтобы сравнить части одного района между собой.
const getRingArea = (ring: GeoJsonRing) =>
  Math.abs(
    ring.reduce((sum, [x1, y1], index) => {
      const [x2, y2] = ring[(index + 1) % ring.length];
      return sum + x1 * y2 - x2 * y1;
    }, 0)
  ) / 2;

// GeoJSON хранит [долгота, широта] и повторяет первую вершину в конце — карте это не нужно.
const toPositions = (ring: GeoJsonRing): MapPosition[] =>
  ring.slice(0, -1).map(([lng, lat]) => [lat, lng]);

/**
 * Границы района или города по идентификатору OSM (`R1255942`) через Nominatim.
 * Возвращает контуры в формате районов карты: первый — внешняя граница, остальные — отверстия.
 * Если район состоит из нескольких частей, берём самую большую.
 * Запрос одиночный, по выбору пользователя, поэтому правила Nominatim не нарушает.
 */
export const fetchBoundary = async (
  areaId: string,
  signal?: AbortSignal
): Promise<MapPosition[][] | undefined> => {
  const params = new URLSearchParams({
    osm_ids: areaId,
    format: 'jsonv2',
    polygon_geojson: '1',
    polygon_threshold: POLYGON_THRESHOLD,
  });

  const response = await fetch(`${NOMINATIM_LOOKUP_URL}?${params}`, { signal });
  if (!response.ok) {
    throw new Error(`Nominatim: ${response.status}`);
  }

  const [place]: NominatimBoundary[] = await response.json();
  const { type, coordinates } = place?.geojson ?? {};
  if (type === 'Polygon') {
    return (coordinates as GeoJsonRing[]).map(toPositions);
  }
  if (type === 'MultiPolygon') {
    const largest = (coordinates as GeoJsonRing[][]).reduce((best, part) =>
      getRingArea(part[0]) > getRingArea(best[0]) ? part : best
    );
    return largest.map(toPositions);
  }
  return undefined;
};
