'use client';

import { Flex, chakra } from '@chakra-ui/react';
import { IconButton } from '@/shared/icon-button';
import { CloseIcon } from '@/shared/icons';
import {
  districtButtonStyle,
  districtRowStyle,
  getDistrictSwatchStyle,
  removeButtonStyle,
} from './MapLegend.styles';

type MapLegendDistrictProps = {
  name: string;
  selected: boolean;
  onToggle: () => void;
  /** Есть только у районов, найденных через поиск: их можно убрать с карты. */
  onRemove?: () => void;
};

/**
 * Строка легенды для района: кружок-образец заливки и название.
 * Нажатие включает или выключает выделение района на карте; у выключенного образец бледный.
 * У района, найденного через поиск, справа крестик — он убирает район с карты.
 */
export const MapLegendDistrict = ({
  name,
  selected,
  onToggle,
  onRemove,
}: MapLegendDistrictProps) => (
  <Flex {...districtRowStyle}>
    <chakra.button
      type="button"
      aria-pressed={selected}
      aria-label={`Выделить район «${name}» на карте`}
      title={`Выделить район «${name}» на карте`}
      {...districtButtonStyle}
      onClick={onToggle}
    >
      <chakra.span {...getDistrictSwatchStyle(selected)} />
      {name}
    </chakra.button>
    {onRemove && (
      <IconButton
        label={`Убрать район «${name}» с карты`}
        {...removeButtonStyle}
        onClick={onRemove}
      >
        <CloseIcon size={14} />
      </IconButton>
    )}
  </Flex>
);
