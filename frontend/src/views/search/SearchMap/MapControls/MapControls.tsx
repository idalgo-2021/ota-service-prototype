'use client';

import { Box, chakra } from '@chakra-ui/react';
import { IconButton } from '@/shared/icon-button';
import {
  recenterButtonStyle,
  rootStyle,
  zoomButtonStyle,
  zoomGroupStyle,
} from './MapControls.styles';

type MapControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
};

const PlusIcon = () => (
  <chakra.svg aria-hidden viewBox="0 0 24 24" w="20px" h="20px" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </chakra.svg>
);

const MinusIcon = () => (
  <chakra.svg aria-hidden viewBox="0 0 24 24" w="20px" h="20px" fill="none">
    <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </chakra.svg>
);

const RecenterIcon = () => (
  <chakra.svg aria-hidden viewBox="0 0 24 24" w="20px" h="20px" fill="none">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 3v3M12 18v3M3 12h3M18 12h3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </chakra.svg>
);

/**
 * Колонка кнопок у правого верхнего края карты: блок масштаба
 * и отдельная кнопка, возвращающая карту к центру города.
 */
export const MapControls = ({ onZoomIn, onZoomOut, onRecenter }: MapControlsProps) => (
  <Box {...rootStyle}>
    <Box role="group" aria-label="Масштаб карты" {...zoomGroupStyle}>
      <IconButton label="Приблизить" {...zoomButtonStyle} onClick={onZoomIn}>
        <PlusIcon />
      </IconButton>
      <IconButton label="Отдалить" {...zoomButtonStyle} onClick={onZoomOut}>
        <MinusIcon />
      </IconButton>
    </Box>
    <IconButton label="К центру города" {...recenterButtonStyle} onClick={onRecenter}>
      <RecenterIcon />
    </IconButton>
  </Box>
);
