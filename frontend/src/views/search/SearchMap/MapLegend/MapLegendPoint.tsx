'use client';

import { chakra } from '@chakra-ui/react';
import { getPointKind } from '../constants';
import type { MapPoint } from '../types';
import { getPointDotStyle, pointButtonStyle } from './MapLegend.styles';

type MapLegendPointProps = {
  point: MapPoint;
  onFocus: () => void;
};

/**
 * Пункт легенды для пользовательской точки: цветной кружок со значком её типа
 * (офис, концертная площадка, вокзал) и название. Нажатие перелетает к точке на карте.
 */
export const MapLegendPoint = ({ point, onFocus }: MapLegendPointProps) => {
  const { glyph, color } = getPointKind(point);

  return (
    <chakra.button
      type="button"
      aria-label={`Показать «${point.name}» на карте`}
      title={`Показать «${point.name}» на карте`}
      {...pointButtonStyle}
      onClick={onFocus}
    >
      <chakra.span aria-hidden {...getPointDotStyle(color)}>
        {glyph}
      </chakra.span>
      {point.name}
    </chakra.button>
  );
};
