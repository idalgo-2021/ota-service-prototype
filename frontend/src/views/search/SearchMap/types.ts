import type { UnitType } from '@/lib/api';

export type MapPosition = [number, number];

export type MapHotel = {
  id: string;
  name: string;
  position: MapPosition;
  /** Без цены метка подписывается названием отеля. */
  price?: number;
  currency?: string;
  startingPriceUnitType?: UnitType;
  priceGuests?: string;
  /** Оценка по отзывам от 1 до 10 — показывается под ценой или названием */
  rating?: number;
  reviewCount?: number;
  typeName?: string;
  address?: string;
  description?: string;
  image?: string | null;
  href?: string;
};

export type PointKind = 'music' | 'office' | 'station' | 'airport';

export type MapPoint = {
  id: string;
  name: string;
  position: MapPosition;
  kind?: PointKind;
};

/** Культурное событие на карте. Ссылка всегда ведёт на первоисточник афиши. */
export type MapEvent = {
  id: string;
  name: string;
  position: MapPosition;
  venue: string;
  dateLabel: string;
  priceLabel?: string;
  href: string;
};

export type MapHeritageBuilding = {
  id: string;
  name: string;
  address: string;
  position: MapPosition;
  constructionYear: number;
  historicalDescription: string;
  source: string;
};

export type MapNearbyPlace = {
  id: string;
  kind: 'building' | 'pier' | 'event';
  name: string;
  position: MapPosition;
  detail?: string;
  href?: string;
};

export type MapParking = {
  id: number;
  name: string;
  position: MapPosition;
  detail: string;
  evChargingAvailable?: boolean | null;
};

export type MapNightPlace = {
  id: number;
  name?: string | null;
  category: 'pharmacy' | 'store' | 'cafe';
  position: MapPosition;
  address?: string | null;
  openingHours?: string | null;
  sourceUrl: string;
};

export type MapDistrict = {
  id: string;
  name: string;
  positions: MapPosition[][];
};

export type SearchMapData = {
  city: string;
  center: MapPosition;
  hotels: MapHotel[];
  points: MapPoint[];
  events?: MapEvent[];
  heritageBuildings?: MapHeritageBuilding[];
  nearbyPlaces?: MapNearbyPlace[];
  parkings?: MapParking[];
  nightPlaces?: MapNightPlace[];
  districts: MapDistrict[];
  selectedDistrictIds?: string[];
};

export type SearchSuggestion = {
  id: string;
  name: string;
  address?: string;
  position: MapPosition;
  /**
   * `map` — отель или точка с карты, к ним просто подлетаем;
   * `place` — место из геокодера, показывается маркером, который можно добавить в «мои места»;
   * `district` — район или город: загружаются его границы и он выделяется на карте целиком.
   */
  kind: 'map' | 'place' | 'district';
  /** Идентификатор OSM для загрузки границ, только у `district`. */
  areaId?: string;
};

/**
 * Область поиска по пользовательским точкам: бэкенд строит их выпуклую оболочку
 * и расширяет её на `radiusM` метров (для одной точки это круг вокруг неё).
 */
export type SearchArea = {
  points: MapPosition[];
  radiusM: number;
};
