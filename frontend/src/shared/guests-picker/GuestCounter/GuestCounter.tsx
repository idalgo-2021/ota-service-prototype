'use client';

import { chakra, Flex, Stack, Text } from '@chakra-ui/react';
import type { CatalogLanguage } from '@/lib/api';
import { IconButton } from '../../icon-button';
import {
  buttonStyle,
  controlsStyle,
  hintStyle,
  labelStyle,
  rootStyle,
  textStyle,
  valueStyle,
} from './GuestCounter.styles';
import { useController } from './useController';

type GuestCounterProps = {
  lang?: CatalogLanguage;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onValueChange: (value: number) => void;
};

/** Строка счётчика: подпись слева, справа «−», число и «+» в пределах от `min` до `max`. */
export const GuestCounter = ({
  lang = 'ru',
  label,
  hint,
  value,
  min,
  max,
  onValueChange,
}: GuestCounterProps) => {
  const { handleDecrement, handleIncrement } = useController(value, onValueChange);

  return (
    <Flex {...rootStyle}>
      <Stack {...textStyle}>
        <Text {...labelStyle}>{label}</Text>
        {hint && <Text {...hintStyle}>{hint}</Text>}
      </Stack>
      <Flex {...controlsStyle}>
        <IconButton
          label={`${label}: ${lang === 'en' ? 'decrease' : 'меньше'}`}
          disabled={value <= min}
          {...buttonStyle}
          onClick={handleDecrement}
        >
          −
        </IconButton>
        <chakra.span aria-live="polite" {...valueStyle}>
          {value}
        </chakra.span>
        <IconButton
          label={`${label}: ${lang === 'en' ? 'increase' : 'больше'}`}
          disabled={value >= max}
          {...buttonStyle}
          onClick={handleIncrement}
        >
          +
        </IconButton>
      </Flex>
    </Flex>
  );
};
