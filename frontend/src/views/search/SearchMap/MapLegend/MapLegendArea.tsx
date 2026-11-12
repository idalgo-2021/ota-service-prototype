'use client';

import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import { Checkbox } from '@/shared/checkbox';
import { Range } from '@/shared/range';
import { AREA_RADIUS_MAX, AREA_RADIUS_STEP, formatRadius } from '../area';
import {
  areaCaptionStyle,
  areaErrorStyle,
  areaLabelStyle,
  areaRadiusStyle,
  areaRadiusValueStyle,
  areaStyle,
} from './MapLegend.styles';

// Ползунок принимает подписи списком, по одной на ручку; линтер ждёт в aria-label строку.
const radiusSliderLabels = { 'aria-label': ['Расширение границ области'] };

export type MapLegendAreaProps = {
  enabled: boolean;
  /** Вокруг одной точки ищем в круге, поэтому ползунок подписан как радиус. */
  singlePoint: boolean;
  /** Для одной точки расширение не обнуляется: без него область поиска пустая. */
  minRadius: number;
  radius: number;
  error?: string;
  handleToggle: () => void;
  handleRadiusChange: (radius: number) => void;
  handleRadiusCommit: (radius: number) => void;
};

/**
 * Блок легенды под своими местами: флажок «искать в области мест» и ползунок расширения
 * её границ от 0 до 5 км с шагом 250 м. На нуле ищем строго внутри многоугольника,
 * натянутого на места. Если по местам искать нельзя, показывает причину.
 */
export const MapLegendArea = ({
  enabled,
  singlePoint,
  minRadius,
  radius,
  error,
  handleToggle,
  handleRadiusChange,
  handleRadiusCommit,
}: MapLegendAreaProps) => (
  <Box {...areaStyle}>
    <Checkbox minH="44px" checked={enabled} onCheckedChange={handleToggle}>
      <chakra.span {...areaLabelStyle}>Искать в области моих мест</chakra.span>
    </Checkbox>
    {enabled && (
      <>
        <chakra.span {...areaCaptionStyle}>
          {singlePoint ? 'Радиус вокруг места' : 'Расширить границы на'}
        </chakra.span>
        <Flex {...areaRadiusStyle}>
          <Range
            flex="1"
            min={minRadius}
            max={AREA_RADIUS_MAX}
            step={AREA_RADIUS_STEP}
            value={[radius]}
            {...radiusSliderLabels}
            getAriaValueText={({ value }) => formatRadius(value)}
            onValueChange={({ value }) => handleRadiusChange(value[0])}
            onValueChangeEnd={({ value }) => handleRadiusCommit(value[0])}
          />
          <chakra.span {...areaRadiusValueStyle}>{formatRadius(radius)}</chakra.span>
        </Flex>
        {error && (
          <Text role="status" {...areaErrorStyle}>
            {error}
          </Text>
        )}
      </>
    )}
  </Box>
);
