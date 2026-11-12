'use client';

import 'ol/ol.css';
import { Box, Text } from '@chakra-ui/react';
import type { PoiCategory } from '../pois';
import { MapControls } from '../MapControls';
import type { GeocodeResult } from '../geocode';
import type {
  MapDistrict,
  MapHeritageBuilding,
  MapNearbyPlace,
  MapNightPlace,
  MapPoint,
  MapPosition,
  SearchArea,
  SearchMapData,
} from '../types';
import styles from './MapCanvas.module.css';
import { cssVariables, mapContainerStyle, rootStyle, tileErrorStyle } from './MapCanvas.styles';
import { useController } from './useController';

export type MapCanvasProps = {
  data: SearchMapData;
  poiCategories: PoiCategory[];
  points: MapPoint[];
  showAllHotels: boolean;
  heritageBuildings: MapHeritageBuilding[];
  nearbyPlaces: MapNearbyPlace[];
  nightPlaces: MapNightPlace[];
  /** Районы из данных вместе с найденными через поиск. */
  districts: MapDistrict[];
  districtIds: string[];
  selectedHotelId?: string;
  focusSelectedHotel: boolean;
  initialZoom?: number;
  fitToData?: boolean;
  nearbyStyle: boolean;
  addingPoint: boolean;
  focusPosition?: MapPosition;
  /** Контур, под который подогнать карту: так показывается выбранный район целиком. */
  focusBounds?: MapPosition[];
  searchResult?: GeocodeResult;
  /** Область поиска по своим местам: рисуется на карте, пока по ней ищут. */
  area?: SearchArea;
  onAddPoint: (position: MapPosition) => void;
  onAddSearchResult: () => void;
  onRemovePoint: (id: string) => void;
  onToggleDistrict: (id: string) => void;
  onHotelSelect: (id: string) => void;
};

/**
 * Сама карта OpenLayers: подложка OpenStreetMap, полигоны районов, метки отелей (с ценой или названием),
 * пользовательские точки, транспортные ориентиры, область поиска по ним и маркер найденного места с всплывающими карточками.
 * Поверх карты — кнопки масштаба и сообщение, если тайлы не загрузились.
 * Рендерится только в браузере (подключается через `next/dynamic` без SSR).
 */
export const MapCanvas = (props: MapCanvasProps) => {
  const { addingPoint, nearbyStyle } = props;
  const { containerRef, tileError, handleZoomIn, handleZoomOut, handleRecenter } =
    useController(props);

  return (
    <Box
      className={
        [addingPoint && styles.adding, nearbyStyle && styles.nearbyMap].filter(Boolean).join(' ') ||
        undefined
      }
      style={cssVariables}
      {...rootStyle}
    >
      <div ref={containerRef} className={styles.map} style={mapContainerStyle} />
      <MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onRecenter={handleRecenter} />

      {tileError && (
        <Text role="status" {...tileErrorStyle}>
          Не удалось загрузить карту. Проверьте подключение к интернету.
        </Text>
      )}
    </Box>
  );
};
