'use client';

import { Box, chakra } from '@chakra-ui/react';
import type { MapDistrict, MapPoint } from '../types';
import { clearButtonStyle, pointListStyle, rootStyle } from './MapLegend.styles';
import { MapLegendArea, type MapLegendAreaProps } from './MapLegendArea';
import { MapLegendDistrict } from './MapLegendDistrict';
import { MapLegendPoint } from './MapLegendPoint';

type MapLegendProps = {
  districts: (MapDistrict & {
    selected: boolean;
    handleToggle: () => void;
    handleRemove?: () => void;
  })[];
  points: (MapPoint & { handleFocus: () => void })[];
  area: MapLegendAreaProps;
  onClear: () => void;
};

/**
 * Карточка-легенда в левом нижнем углу карты: сверху районы,
 * под ними пользовательские точки и настройки поиска в их области.
 */
export const MapLegend = ({ districts, points, area, onClear }: MapLegendProps) => (
  <Box as="aside" aria-label="Настройки карты" {...rootStyle}>
    {districts.map((district) => (
      <MapLegendDistrict
        key={district.id}
        name={district.name}
        selected={district.selected}
        onToggle={district.handleToggle}
        onRemove={district.handleRemove}
      />
    ))}
    {points.length > 0 && (
      <Box {...pointListStyle}>
        {points.map((point) => (
          <MapLegendPoint key={point.id} point={point} onFocus={point.handleFocus} />
        ))}
      </Box>
    )}
    {points.length > 0 && <MapLegendArea {...area} />}
    {points.length > 0 && (
      <chakra.button type="button" {...clearButtonStyle} onClick={onClear}>
        Очистить мои места
      </chakra.button>
    )}
  </Box>
);
