'use client';

import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import { useState } from 'react';
import type { Stay } from '@/lib/stay';
import { Button } from '@/shared/button';
import { ResultPlaceholder } from '@/shared/result-placeholder';
import { SortSelect } from '@/shared/sort-select';
import { SegmentedControl, SegmentedControlSkeleton } from '@/shared/segmented-control';
import { ListingCard } from '../ListingCard';
import type { SearchDistance } from '../distance';
import type { PoiCategory } from '../SearchMap/pois';
import { type SearchSort, useListingsSearch } from '../useListingsSearch';
import {
  headerStyle,
  listStyle,
  messageStyle,
  rootStyle,
  summaryTextStyle,
} from './SearchResults.styles';
import { useController } from './useController';

const MESSAGES = {
  error: 'Не удалось загрузить варианты. Попробуйте обновить страницу.',
  notFound: 'Не знаем такого направления. Попробуйте другой город или страну.',
  empty: 'Подходящих вариантов пока нет.',
  chooseCity: 'Укажите город, чтобы посмотреть объекты размещения.',
};

type SearchResultsProps = {
  destination: string;
  stay: Stay;
  tab: string;
  sort: SearchSort;
  search: ReturnType<typeof useListingsSearch>;
  onTabChange: (tab: string) => void;
  onSortChange: (sort: SearchSort) => void;
  selectedId?: string;
  onSelect: (id: string) => void;
  mapMode?: boolean;
  distance?: SearchDistance;
  locationIds?: number[];
  poiCategories?: PoiCategory[];
};

/**
 * Колонка результатов поиска: переключатель типа жилья по справочнику бэкенда
 * (скелетон, пока справочник загружается),
 * строка с количеством найденного и сортировкой (по цене, если выбраны даты)
 * и список карточек объявлений
 * (скелетоны во время загрузки, сообщение, если показывать нечего).
 * Вкладка и выбранное объявление хранятся снаружи, чтобы карта показывала то же самое.
 */
export const SearchResults = ({
  destination,
  stay,
  tab,
  sort,
  search,
  onTabChange,
  onSortChange,
  selectedId,
  onSelect,
  mapMode = false,
  distance,
  locationIds,
  poiCategories,
}: SearchResultsProps) => {
  const [visible, setVisible] = useState({ key: '', count: 20 });
  const visibleCount = visible.key === search.requestKey ? visible.count : 20;
  const {
    tabs,
    tabsLoading,
    summary,
    status,
    items,
    hasMore,
    sort: activeSort,
  } = useController(
    destination,
    stay,
    search,
    sort,
    visibleCount,
    selectedId,
    tab,
    distance,
    locationIds,
    poiCategories
  );

  const renderList = () => {
    if (status === 'loading') {
      return (
        <>
          <ResultPlaceholder />
          <ResultPlaceholder />
          <ResultPlaceholder />
        </>
      );
    }
    if (status === 'ready') {
      return (
        <>
          {items.map(
            ({ listing, price, nights, guests, href, typeName, locationName, reviews }) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                price={price}
                nights={nights}
                guests={guests}
                href={href}
                typeName={typeName}
                locationName={locationName}
                reviews={reviews}
                selected={listing.id === selectedId}
                onSelect={() => onSelect(listing.id)}
              />
            )
          )}
          {hasMore && (
            <Button
              appearance="soft"
              alignSelf="center"
              onClick={() => setVisible({ key: search.requestKey, count: visibleCount + 20 })}
            >
              Показать еще
            </Button>
          )}
        </>
      );
    }
    return <Text {...messageStyle}>{MESSAGES[status]}</Text>;
  };

  return (
    <Stack {...rootStyle} {...(mapMode ? { w: '100%', gap: 0 } : {})}>
      {mapMode ? (
        <Flex
          gap="10px"
          overflowX="auto"
          overflowY="hidden"
          px="12px"
          pb="4px"
          scrollSnapType="x mandatory"
          css={{ scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
        >
          {status === 'ready' ? (
            items.map(
              ({ listing, price, nights, guests, href, typeName, locationName, reviews }) => (
                <Box
                  key={listing.id}
                  flex="0 0 calc(100vw - 24px)"
                  minW="0"
                  scrollSnapAlign="center"
                >
                  <ListingCard
                    listing={listing}
                    price={price}
                    nights={nights}
                    guests={guests}
                    href={href}
                    typeName={typeName}
                    locationName={locationName}
                    reviews={reviews}
                    selected={listing.id === selectedId}
                    onSelect={() => onSelect(listing.id)}
                  />
                </Box>
              )
            )
          ) : (
            <Text bg="white" p="16px" borderRadius="12px">
              {status === 'loading' ? 'Загружаем варианты…' : MESSAGES[status]}
            </Text>
          )}
        </Flex>
      ) : (
        <>
          {tabsLoading ? (
            <SegmentedControlSkeleton />
          ) : (
            <SegmentedControl options={tabs} value={tab} onValueChange={onTabChange} />
          )}
          <Flex {...headerStyle}>
            <Text {...summaryTextStyle}>{summary}</Text>
            <Flex
              gap="8px"
              width={{ base: '100%', md: 'auto' }}
              flexWrap={{ base: 'nowrap', md: 'wrap' }}
            >
              <Box flex={{ base: '1', md: 'initial' }} minW={{ base: 0, md: 'auto' }}>
                <SortSelect
                  by="price"
                  value={activeSort.price}
                  onChange={(price) => onSortChange({ ...activeSort, price })}
                />
              </Box>
              <Box flex={{ base: '1', md: 'initial' }} minW={{ base: 0, md: 'auto' }}>
                <SortSelect
                  by="rating"
                  value={activeSort.rating}
                  onChange={(rating) => onSortChange({ ...activeSort, rating })}
                />
              </Box>
            </Flex>
          </Flex>
          <Stack {...listStyle}>{renderList()}</Stack>
        </>
      )}
    </Stack>
  );
};
