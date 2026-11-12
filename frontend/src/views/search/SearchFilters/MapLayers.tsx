import { Box, Stack, Text } from '@chakra-ui/react';
import { Card } from '@/shared/card';
import { Checkbox } from '@/shared/checkbox';
import { Section } from '@/shared/section';
import { ALL_POI_CATEGORIES, POI_CATEGORIES, type PoiCategory } from '../SearchMap/pois';
import { cardStyle, listStyle } from './SearchFilters.styles';

export type MapLayersProps = {
  categories: PoiCategory[];
  onCategoriesChange: (categories: PoiCategory[]) => void;
};

export const MapLayers = ({ categories, onCategoriesChange }: MapLayersProps) => (
  <Card {...cardStyle}>
    <Stack {...listStyle}>
      <Section title="Показывать на карте">
        {ALL_POI_CATEGORIES.map((id) => (
          <Checkbox
            key={id}
            checked={categories.includes(id)}
            onCheckedChange={({ checked }) =>
              onCategoriesChange(
                checked === true
                  ? [...categories, id]
                  : categories.filter((category) => category !== id)
              )
            }
          >
            <Box
              as="span"
              display="inline-block"
              w="8px"
              h="8px"
              borderRadius="full"
              bg={POI_CATEGORIES[id].color}
              mr="6px"
              aria-hidden="true"
            />
            {POI_CATEGORIES[id].name}
          </Checkbox>
        ))}
      </Section>
      <Text fontSize="12px" color="fg.muted">
        Демо: объекты Петроградской стороны.
      </Text>
      {categories.length === 0 && (
        <Text role="status" fontSize="12px">
          Все категории скрыты. Отели остаются на карте.
        </Text>
      )}
    </Stack>
  </Card>
);
