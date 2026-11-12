import type VectorTileLayer from 'ol/layer/VectorTile.js';
import { applyBackground, applyStyle } from 'ol-mapbox-style';

/**
 * Векторная подложка OpenFreeMap (данные OpenStreetMap).
 * https://openfreemap.org
 */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const SOURCE_ID = 'openmaptiles';

/** Во сколько раз уменьшить шрифт всех надписей подложки. */
const TEXT_SCALE = 0.85;
/** Минимальный зазор вокруг надписи, px: не влезающие надписи скрываются, так их становится меньше. */
const TEXT_PADDING = 8;

/** С какого зума показывать слой — поздно, чтобы на обзорных масштабах карта была чище. */
const LAYER_MIN_ZOOM: Record<string, number> = {
  'highway-name-minor': 16,
  'highway-name-path': 16,
  poi_r1: 17,
  poi_r7: 17,
  poi_transit: 15,
};

/** Слои, которые в городе только мешают: номера трасс. */
const HIDDEN_LAYERS = new Set([
  'highway-shield-non-us',
  'highway-shield-us-interstate',
  'road_shield_us',
]);

type StyleLayer = {
  id: string;
  type: string;
  minzoom?: number;
  layout?: Record<string, unknown>;
};

type GlStyle = { layers: StyleLayer[] };

/**
 * Уменьшает `text-size`. Размер бывает числом или `interpolate` по зуму.
 */
const scaleTextSize = (size: unknown): unknown => {
  if (typeof size === 'number') {
    return size * TEXT_SCALE;
  }
  if (Array.isArray(size) && size[0] === 'interpolate') {
    return size.map((value, index) =>
      index >= 4 && index % 2 === 0 && typeof value === 'number' ? value * TEXT_SCALE : value
    );
  }
  return size;
};

const tuneStyle = (style: GlStyle): GlStyle => {
  for (const layer of style.layers) {
    if (HIDDEN_LAYERS.has(layer.id)) {
      layer.layout = { ...layer.layout, visibility: 'none' };
      continue;
    }
    if (layer.id in LAYER_MIN_ZOOM) {
      layer.minzoom = LAYER_MIN_ZOOM[layer.id];
    }
    if (layer.type !== 'symbol' || !layer.layout?.['text-field']) {
      continue;
    }

    layer.layout['text-size'] = scaleTextSize(layer.layout['text-size'] ?? 16);
    layer.layout['text-padding'] = TEXT_PADDING;
  }
  return style;
};

const RETRY_DELAY = 1000;

/** Загружает JSON стиля; сервер изредка отвечает 503, поэтому одна повторная попытка. */
const fetchStyle = async (signal: AbortSignal, retry = true): Promise<GlStyle> => {
  const response = await fetch(STYLE_URL, { signal });
  if (response.ok) {
    return response.json();
  }
  if (!retry) {
    throw new Error(`Стиль подложки: ${response.status}`);
  }

  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
  return fetchStyle(signal, false);
};

/** Загружает стиль Bright, прореживает надписи и применяет его к слою подложки. */
export const applyBasemapStyle = async (layer: VectorTileLayer, signal: AbortSignal) => {
  const style = tuneStyle(await fetchStyle(signal));
  await applyStyle(layer, style, SOURCE_ID);
  applyBackground(layer, style);
};
