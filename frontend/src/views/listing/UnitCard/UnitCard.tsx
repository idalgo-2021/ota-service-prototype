'use client';

import { Flex, Stack, Text } from '@chakra-ui/react';
import type { Guests, ListingUnit } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { formatGuestsForPrice, formatNights } from '@/lib/stay';
import { Button } from '@/shared/button';
import { Card } from '@/shared/card';
import { ImageCarousel, orderedImageUrls } from '@/shared/image-carousel';
import { formatCapacity, UNIT_TYPE_LABELS } from '../units';
import {
  detailsStyle,
  getCardStyle,
  imageStyle,
  infoStyle,
  nameStyle,
  priceStackStyle,
  priceStyle,
  rowStyle,
  selectButtonStyle,
  totalStyle,
  typeStyle,
} from './UnitCard.styles';

type UnitCardProps = {
  unit: ListingUnit;
  nights: number;
  guests: Guests;
  selected: boolean;
  onToggle: () => void;
};

/**
 * Свободный номер, место или квартира целиком: фото, тип, название (для места — с комнатой),
 * вместимость и питомцы, цена за ночь и за всю поездку и кнопка выбора.
 * Выбранная карточка обведена, кнопка становится «Выбрано».
 */
export const UnitCard = ({ unit, nights, guests, selected, onToggle }: UnitCardProps) => {
  const images = orderedImageUrls(undefined, unit.images);
  const name = unit.parent_name ? `${unit.parent_name} · ${unit.name}` : unit.name;
  const details = [formatCapacity(unit), unit.pets_allowed ? 'можно с питомцем' : null]
    .filter(Boolean)
    .join(', ');
  const fitsGuests =
    unit.capacity_adults >= guests.adults &&
    unit.capacity_children >= guests.children &&
    (!guests.pets || unit.pets_allowed);
  const priceScope = fitsGuests
    ? formatGuestsForPrice(guests)
    : unit.type === 'bed'
      ? 'за одно место'
      : unit.type === 'room'
        ? 'за номер'
        : 'за объект';

  return (
    <Card {...getCardStyle(selected)}>
      <Flex {...rowStyle}>
        <ImageCarousel images={images} title={name} imageStyle={imageStyle} />
        <Stack {...infoStyle}>
          <Text {...typeStyle}>{UNIT_TYPE_LABELS[unit.type]}</Text>
          <Text {...nameStyle}>{name}</Text>
          <Text {...detailsStyle}>{details}</Text>
        </Stack>
        <Stack {...priceStackStyle}>
          <Text {...priceStyle}>{formatMoney(unit.price_per_night, unit.currency)} за ночь</Text>
          <Text {...totalStyle}>
            {formatMoney(Number(unit.price_per_night) * nights, unit.currency)} за{' '}
            {formatNights(nights)}
          </Text>
          <Text {...totalStyle}>{priceScope}</Text>
          <Button
            appearance={selected ? 'soft' : 'primary'}
            aria-pressed={selected}
            {...selectButtonStyle}
            onClick={onToggle}
          >
            {selected ? 'Выбрано' : 'Выбрать'}
          </Button>
        </Stack>
      </Flex>
    </Card>
  );
};
