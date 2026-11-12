'use client';

import { Box, Skeleton, Text, chakra } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import { ALL_POI_CATEGORIES, type PoiCategory } from './pois';
import { MapLegend } from './MapLegend';
import { MapToolbar } from './MapToolbar';
import {
  getRootStyle,
  hintStyle,
  loadingStyle,
  nearbyMapButtonStyle,
  skeletonStyle,
} from './SearchMap.styles';
import type { MapPoint, SearchArea, SearchMapData } from './types';
import { useController } from './useController';

// OpenLayers загружается в браузере, чтобы DOM карты создавался после монтирования.
const MapCanvas = dynamic(() => import('./MapCanvas').then((module) => module.MapCanvas), {
  ssr: false,
  loading: () => <Skeleton {...loadingStyle} role="status" aria-label="Загрузка карты" />,
});

/**
 * Заглушка на месте карты того же размера, пока код карты загружается в браузере.
 */
export const SearchMapSkeleton = () => (
  <Skeleton {...skeletonStyle} role="status" aria-label="Загрузка карты" />
);

export type SearchMapProps = {
  data: SearchMapData;
  demo?: boolean;
  compactControls?: boolean;
  hideExpandControl?: boolean;
  /** Скрывает панель поиска и добавления мест, когда карта используется только как вид выдачи. */
  hideToolbar?: boolean;
  /** Показывает отдельную метку для каждого отеля, без кластеров. */
  showAllHotels?: boolean;
  poiCategories?: PoiCategory[];
  /** Выбранный отель; выбор снаружи приближает карту к нему. */
  selectedHotelId?: string;
  /** Приближает карту к выбранному отелю вместо общего охвата всех объектов. */
  focusSelectedHotel?: boolean;
  /** Фиксированный масштаб для обзорного режима карты. */
  initialZoom?: number;
  /** Не подгонять обзор под объекты, чтобы карта оставалась по центру города. */
  fitToData?: boolean;
  /** Визуальный режим карты для блока «места рядом» в карточке отеля. */
  nearbyStyle?: boolean;
  onPointsChange?: (points: MapPoint[]) => void;
  onDistrictsChange?: (ids: string[]) => void;
  onHotelSelect?: (id: string) => void;
  /** Область поиска по своим местам; `undefined`, когда поиск по области выключен. */
  onAreaChange?: (area: SearchArea | undefined) => void;
};

/**
 * Интерактивная карта города на странице поиска. Сверху — панель
 * (полноэкранный режим, добавление места, поиск), под ней строка-подсказка о текущем
 * действии или результате поиска, в центре — сама карта с отелями,
 * районами и точками, в левом нижнем углу — легенда, если на карте есть районы или свои места.
 * Когда своих мест хоть одно, в легенде можно включить поиск в их области и расширить её границы;
 * область рисуется на карте.
 * Состояние (точки, выбранные районы, область, поиск) хранится здесь и отдаётся наружу через колбэки,
 * выбранный отель задаётся снаружи.
 */
export const SearchMap = ({
  data,
  compactControls = false,
  hideExpandControl = false,
  hideToolbar = false,
  showAllHotels = false,
  poiCategories = ALL_POI_CATEGORIES,
  selectedHotelId,
  focusSelectedHotel = false,
  initialZoom,
  fitToData,
  nearbyStyle = false,
  onPointsChange,
  onDistrictsChange,
  onHotelSelect,
  onAreaChange,
}: SearchMapProps) => {
  const {
    points,
    districtIds,
    allDistricts,
    focusPosition,
    focusBounds,
    addingPoint,
    expanded,
    query,
    hint,
    searching,
    searchResult,
    searchSuggestions,
    districts,
    legendPoints,
    area,
    legendArea,
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
  } = useController({
    data,
    selectedHotelId,
    onPointsChange,
    onDistrictsChange,
    onHotelSelect,
    onAreaChange,
  });

  return (
    <Box as="section" aria-label={`Карта: ${data.city}`} {...getRootStyle(expanded)}>
      {!hideToolbar && (
        <MapToolbar
          expanded={expanded}
          compact={compactControls && !expanded}
          hideExpandControl={hideExpandControl}
          addingPoint={addingPoint}
          query={query}
          searching={searching}
          searchSuggestions={searchSuggestions}
          onToggleExpanded={handleToggleExpanded}
          onToggleAdding={handleToggleAdding}
          onQueryChange={handleQueryChange}
          onSearchKeyDown={handleSearchKeyDown}
          onSearchBlur={handleSearchBlur}
          onSearch={handleSearch}
        />
      )}
      {!hideToolbar && hint && (
        <Text role="status" {...hintStyle}>
          {hint}
        </Text>
      )}
      {nearbyStyle && (
        <chakra.button
          type="button"
          aria-label={expanded ? 'Закрыть полноэкранную карту' : 'Открыть карту'}
          onClick={handleToggleExpanded}
          {...nearbyMapButtonStyle}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M7.5 3H3v4.5M12.5 17H17v-4.5M3 7.5 8 2.5M17 12.5l-5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {expanded ? 'Закрыть карту' : 'Открыть карту'}
        </chakra.button>
      )}
      <MapCanvas
        data={data}
        poiCategories={poiCategories}
        points={points}
        showAllHotels={showAllHotels}
        heritageBuildings={data.heritageBuildings ?? []}
        nearbyPlaces={data.nearbyPlaces ?? []}
        nightPlaces={data.nightPlaces ?? []}
        districts={allDistricts}
        districtIds={districtIds}
        selectedHotelId={selectedHotelId}
        focusSelectedHotel={focusSelectedHotel}
        initialZoom={initialZoom}
        fitToData={fitToData}
        nearbyStyle={nearbyStyle}
        addingPoint={addingPoint}
        focusPosition={focusPosition}
        focusBounds={focusBounds}
        searchResult={searchResult}
        area={area}
        onAddPoint={handleAddPoint}
        onAddSearchResult={handleAddSearchResult}
        onRemovePoint={handleRemovePoint}
        onToggleDistrict={handleToggleDistrict}
        onHotelSelect={handleHotelSelect}
      />
      {(districts.length > 0 || legendPoints.length > 0) && (
        <MapLegend
          districts={districts}
          points={legendPoints}
          area={legendArea}
          onClear={handleClearPoints}
        />
      )}
    </Box>
  );
};
