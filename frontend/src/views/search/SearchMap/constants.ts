import { colors } from '@/shared/colors';
import type { MapPoint, PointKind } from './types';

export const DEFAULT_ZOOM = 13;
export const FOCUS_ZOOM = 15;

/** Постоянная точка возврата для поиска по Санкт‑Петербургу: Дворцовая площадь. */
export const SAINT_PETERSBURG_CENTER: [number, number] = [59.9386, 30.3141];

/** Отступы оставляют место под панель инструментов сверху и легенду снизу. */
export const FIT_BOUNDS_OPTIONS = {
  padding: [140, 160, 90, 55],
  maxZoom: 14,
  duration: 0,
};

/** Дальше векторные тайлы только растягиваются, новых деталей нет. */
export const MAX_ZOOM = 19;

export const mapColors = {
  background: '#EDF0E8',
  district: '#6C9FEB',
  districtSoft: '#DCE9FF',
  districtLabel: '#2456B7',
  districtLabelBg: '#F2F6FFDD',
  districtLabelBorder: '#C3D5F5',
  shadow: '#24324B20',
} as const;

export const POINT_KINDS: Record<PointKind, { glyph: string; color: string }> = {
  office: { glyph: '▣', color: colors.primary },
  music: { glyph: '♫', color: '#963DD3' },
  station: { glyph: '▤', color: '#099447' },
  airport: { glyph: '✈', color: '#1769aa' },
};

export const getPointKind = (point: MapPoint) => POINT_KINDS[point.kind ?? 'office'];
