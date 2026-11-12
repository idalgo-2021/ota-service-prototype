import type { MapPosition, SearchArea } from './types';

/** Шаг ползунка расширения границ области. */
export const AREA_RADIUS_STEP = 250;
/** Бэкенд по умолчанию расширяет область на 1000 м. */
export const AREA_RADIUS_DEFAULT = 1000;
/** Больше бэкенд не принимает (MAX_SEARCH_RADIUS_M). */
export const AREA_RADIUS_MAX = 5000;
/** Ограничения бэкенда на набор точек: до 100 точек не дальше 100 км друг от друга. */
const AREA_MAX_POINTS = 100;
const AREA_MAX_SPAN_M = 100_000;

const EARTH_RADIUS_M = 6_371_000;
/** Сколько вершин у круга вокруг каждой точки при рисовании расширенной области. */
const CIRCLE_SEGMENTS = 48;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const distanceM = ([latA, lonA]: MapPosition, [latB, lonB]: MapPosition) => {
  const dLat = toRadians(latB - latA);
  const dLon = toRadians(lonB - lonA);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Почему по этим точкам нельзя искать, или `undefined`, если можно. */
export const getAreaError = (positions: MapPosition[]) => {
  if (positions.length > AREA_MAX_POINTS) {
    return `Для поиска по области нужно не больше ${AREA_MAX_POINTS} мест.`;
  }
  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      if (
        Math.abs(positions[i][1] - positions[j][1]) > 180 ||
        distanceM(positions[i], positions[j]) > AREA_MAX_SPAN_M
      ) {
        return 'Места дальше 100 км друг от друга — уберите лишние, чтобы искать по области.';
      }
    }
  }
  return undefined;
};

export const formatRadius = (meters: number) =>
  meters < 1000
    ? `${meters} м`
    : `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(meters / 1000)} км`;

type Point = [number, number];

const cross = (o: Point, a: Point, b: Point) =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

// Выпуклая оболочка методом Эндрю; вершины идут против часовой стрелки без повтора первой.
const convexHull = (points: Point[]) => {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) {
    return sorted;
  }
  const build = (items: Point[]) => {
    const hull: Point[] = [];
    for (const point of items) {
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
        hull.pop();
      }
      hull.push(point);
    }
    hull.pop();
    return hull;
  };
  return [...build(sorted), ...build([...sorted].reverse())];
};

/**
 * Контур области поиска так же, как её строит бэкенд: выпуклая оболочка точек,
 * расширенная на `radiusM` метров. Расширенная оболочка — это оболочка кругов вокруг точек;
 * считаем её в локальной плоской проекции, для рисования на карте этой точности хватает.
 */
export const getAreaOutline = ({ points, radiusM }: SearchArea): MapPosition[] => {
  if (!points.length) {
    return [];
  }
  const originLat = points.reduce((sum, [lat]) => sum + lat, 0) / points.length;
  const metersPerLat = toRadians(1) * EARTH_RADIUS_M;
  const metersPerLon = metersPerLat * Math.cos(toRadians(originLat));
  const projected = points.map(([lat, lon]): Point => [lon * metersPerLon, lat * metersPerLat]);
  const expanded = radiusM
    ? projected.flatMap(([x, y]) =>
        Array.from({ length: CIRCLE_SEGMENTS }, (_, index): Point => {
          const angle = (2 * Math.PI * index) / CIRCLE_SEGMENTS;
          return [x + radiusM * Math.cos(angle), y + radiusM * Math.sin(angle)];
        })
      )
    : projected;
  return convexHull(expanded).map(([x, y]) => [y / metersPerLat, x / metersPerLon]);
};
