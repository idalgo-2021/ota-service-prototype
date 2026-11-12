import type { GeocodeResult } from './geocode';
import type { MapPosition } from './types';

const PHOTON_URL = 'https://photon.komoot.io/api/';

const SUGGESTIONS_LIMIT = 5;

/** Насколько сильно поднимать места рядом с центром города: зум и вес близости (0–1). */
const LOCATION_BIAS_ZOOM = '11';
const LOCATION_BIAS_SCALE = '0.5';

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type: 'N' | 'W' | 'R';
    osm_id: number;
    osm_key: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

export type PlaceSuggestion = GeocodeResult & {
  /** Идентификатор OSM вида `R1255942`, если место — район или город с границами. */
  areaId?: string;
};

// Границы есть только у линий и отношений OSM, а районы и города отмечены ключами place и boundary.
const isArea = ({ osm_type, osm_key }: PhotonFeature['properties']) =>
  osm_type !== 'N' && (osm_key === 'place' || osm_key === 'boundary');

const join = (parts: (string | undefined)[]) => parts.filter(Boolean).join(', ');

const toSuggestion = ({ geometry, properties }: PhotonFeature): PlaceSuggestion => {
  const { name, street, housenumber, district, city, state, country } = properties;
  const streetAddress = join([street, housenumber]);
  const [lng, lat] = geometry.coordinates;

  return {
    name: name || streetAddress || city || '',
    address: join([name ? streetAddress : undefined, district, city ?? state, country]),
    position: [lat, lng],
    areaId: isArea(properties) ? `${properties.osm_type}${properties.osm_id}` : undefined,
  };
};

/**
 * Подсказки мест по мере ввода через Photon (komoot, данные OpenStreetMap).
 * В отличие от Nominatim, сервис рассчитан на автодополнение и понимает неполные слова.
 * Русский язык в `lang` не поддерживается, а без параметра сервис берёт язык браузера,
 * поэтому явно просим `default` — местные названия, для России это и есть русские.
 * Места ближе к центру города идут первыми. У районов и городов есть `areaId` —
 * по нему можно загрузить границы.
 * https://photon.komoot.io
 */
export const suggestPlaces = async (
  query: string,
  [lat, lng]: MapPosition,
  signal?: AbortSignal
): Promise<PlaceSuggestion[]> => {
  const params = new URLSearchParams({
    q: query,
    limit: String(SUGGESTIONS_LIMIT),
    lang: 'default',
    lat: String(lat),
    lon: String(lng),
    zoom: LOCATION_BIAS_ZOOM,
    location_bias_scale: LOCATION_BIAS_SCALE,
  });

  const response = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!response.ok) {
    throw new Error(`Photon: ${response.status}`);
  }

  const { features }: { features: PhotonFeature[] } = await response.json();
  // Одно место в OSM бывает несколькими объектами (например, выходы метро) — оставляем первый.
  const seen = new Set<string>();
  return features.map(toSuggestion).filter(({ name, address }) => {
    const key = `${name}|${address}`;
    if (!name || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};
