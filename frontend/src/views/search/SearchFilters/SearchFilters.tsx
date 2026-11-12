'use client';

import { Stack, Text } from '@chakra-ui/react';
import { Card } from '@/shared/card';
import { Checkbox } from '@/shared/checkbox';
import { RadioButton, RadioButtonGroup } from '@/shared/radio-button';
import { Section } from '@/shared/section';
import { Toggle } from '@/shared/toggle';

import { MapLayers, type MapLayersProps } from './MapLayers';

import { DISTANCE_OPTIONS, type SearchDistance } from '../distance';

import { PriceFilter } from './PriceFilter';
import {
  cardStyle,
  distanceListStyle,
  favoritesLabelStyle,
  favoritesToggleStyle,
  listStyle,
  roomsListStyle,
} from './SearchFilters.styles';

type SearchFiltersProps = {
  distance: SearchDistance;
  onDistanceChange: (distance: SearchDistance) => void;
};
/**
 * Карточка фильтров в боковой колонке поиска.
 */
export const SearchFilters = ({ distance, onDistanceChange, categories, onCategoriesChange }: SearchFiltersProps & Partial<MapLayersProps>) => {
  return (
    <>
      <Card {...cardStyle}>
        <Stack {...listStyle}>
          <Toggle {...favoritesToggleStyle} defaultChecked={false}>
            <Text {...favoritesLabelStyle}>Избранное</Text>
          </Toggle>

          <PriceFilter />

          <Section title="Условия заезда">
            <Checkbox>Бесконтактное заселение</Checkbox>
            <Checkbox>Без депозита</Checkbox>
          </Section>

          <Section title="Количество комнат">
            <RadioButtonGroup defaultValue="any">
              <Stack {...roomsListStyle}>
                <RadioButton value="any">Любое</RadioButton>
                <RadioButton value="1+">1+</RadioButton>
                <RadioButton value="2+">2+</RadioButton>
              </Stack>
            </RadioButtonGroup>
          </Section>

          <Section title="Расстояние от центра">
            <RadioButtonGroup
              aria-label="Расстояние от центра"
              value={distance}
              onValueChange={({ value }) => {
                const option = DISTANCE_OPTIONS.find((option) => option.value === value);
                if (option) {
                  onDistanceChange(option.value);
                }
              }}
            >
              <Stack {...distanceListStyle}>
                {DISTANCE_OPTIONS.map(({ value, label }) => (
                  <RadioButton key={value} value={value}>
                    {label}
                  </RadioButton>
                ))}
              </Stack>
            </RadioButtonGroup>
          </Section>
        </Stack>
      </Card>
      {categories && onCategoriesChange && (
        <MapLayers categories={categories} onCategoriesChange={onCategoriesChange} />
      )}
    </>
  )
}
