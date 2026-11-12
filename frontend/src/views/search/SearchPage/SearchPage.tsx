'use client';

import { Box, Button, Dialog, Flex, Portal, Stack } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ALL_POI_CATEGORIES, type PoiCategory } from '../SearchMap/pois';
import type { Stay } from '@/lib/stay';
import { IconButton } from '@/shared/icon-button';
import { FilterIcon, ListIcon, MapIcon } from '@/shared/icons';
import type { SearchDistance } from '../distance';
import type { SearchSort } from '../useListingsSearch';
import { SearchFilters } from '../SearchFilters';
import { SearchResults } from '../SearchResults';
import { SearchSummary } from '../SearchSummary';
import { SearchMapSkeleton } from '../SearchMap';
import { contentStyle, mapStyle, resultsStyle, rootStyle, sidebarStyle } from './SearchPage.styles';
import { useController } from './useController';

// Карта работает только с JS, поэтому рендерится лишь в браузере: иначе поле поиска
// на ней видно до гидратации, и введённый в него текст React затирает пустым значением.
const SearchMap = dynamic(() => import('../SearchMap').then((module) => module.SearchMap), {
  ssr: false,
  loading: SearchMapSkeleton,
});

type SearchPageProps = {
  destination: string;
  stay: Stay;
  locationIds: number[];
  guestsExplicit: boolean;
  initialTab?: string | null;
  initialSort?: SearchSort | null;
  initialDistance?: SearchDistance;
  initialSelectedId?: string;
  initialPoiCategories?: PoiCategory[];
};

/**
 * Страница результатов поиска (сводка запроса, фильтры, результаты и карта).
 * Карта показывает всю найденную выборку, список раскрывает карточки порциями.
 * Клик по метке выделяет карточку, клик по карточке — метку.
 * Если на карте включён поиск в области своих мест, выдача берётся из этой области.
 * На широком экране карта стоит справа на всю высоту под шапкой, а фильтры и выдача
 * прокручиваются рядом с ней; на узкой карте идёт под выдачей.
 */
export const SearchPage = ({
  destination,
  stay,
  locationIds,
  guestsExplicit,
  initialTab,
  initialSort,
  initialDistance,
  initialSelectedId,
  initialPoiCategories,
}: SearchPageProps) => {
  const {
    tab,
    sort,
    distance,
    poiCategories,
    search,
    displayDestination,
    mapData,
    showMap,
    mapReady,
    selectedId,
    handleAreaChange,
    handleTabChange,
    handleSortChange,
    handleDistanceChange,
    handlePoiCategoriesChange,
    handleSelect,
  } = useController(
    destination,
    stay,
    locationIds,
    guestsExplicit,
    initialTab,
    initialSort,
    initialDistance,
    initialSelectedId,
    initialPoiCategories
  );
  const [mobileView, setMobileView] = useState<'results' | 'map'>('results');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const currentLocationIds = search.locationIds.length ? search.locationIds : locationIds;

  return (
    <Flex {...rootStyle}>
      <Box display={{ base: 'block', xl: 'none' }} px="0" pt="8px">
        <Flex px="16px" gap="12px" align="stretch">
          <Box flex="1" minW="0">
            <SearchSummary
              destination={displayDestination}
              locationIds={currentLocationIds}
              stay={search.effectiveStay}
            />
          </Box>
          <Stack
            flexShrink="0"
            alignSelf="flex-start"
            gap="4px"
            width="48px"
            p="4px"
            bg="white"
            borderRadius="14px"
            boxShadow="0 4px 18px rgba(45, 49, 55, 0.14)"
          >
            {mobileView === 'results' && (
              <IconButton
                label="Фильтры"
                display="flex"
                alignItems="center"
                justifyContent="center"
                w="40px"
                h="40px"
                color="#0e41d2"
                bg="white"
                borderRadius="10px"
                cursor="pointer"
                _hover={{ bg: '#f2f2f4' }}
                _focusVisible={{ outline: '2px solid #0e41d2', outlineOffset: '2px' }}
                onClick={() => setFiltersOpen(true)}
              >
                <FilterIcon size={24} />
              </IconButton>
            )}
            <IconButton
              label={mobileView === 'map' ? 'Показать список' : 'Показать карту'}
              aria-pressed={mobileView === 'map'}
              display="flex"
              alignItems="center"
              justifyContent="center"
              w="40px"
              h="40px"
              color="#0e41d2"
              bg={mobileView === 'map' ? '#e7ecfb' : 'white'}
              borderRadius="10px"
              cursor="pointer"
              _hover={{ bg: '#f2f2f4' }}
              _focusVisible={{ outline: '2px solid #0e41d2', outlineOffset: '2px' }}
              onClick={() => setMobileView(mobileView === 'map' ? 'results' : 'map')}
            >
              {mobileView === 'map' ? <ListIcon size={24} /> : <MapIcon size={24} />}
            </IconButton>
          </Stack>
        </Flex>
      </Box>
      <Flex
        {...contentStyle}
        display={{ base: mobileView === 'map' ? 'none' : 'flex', xl: 'flex' }}
        mt={5}
      >
        <Stack as="aside" {...sidebarStyle}>
          <SearchSummary
            destination={displayDestination}
            locationIds={currentLocationIds}
            stay={search.effectiveStay}
          />
          <SearchFilters
            distance={distance}
            categories={showMap ? poiCategories : undefined}
            onCategoriesChange={handlePoiCategoriesChange}
            onDistanceChange={handleDistanceChange}
          />
        </Stack>

        <Box as="main" {...resultsStyle}>
          <SearchResults
            destination={displayDestination}
            stay={search.effectiveStay}
            tab={tab}
            sort={sort}
            distance={distance}
            locationIds={currentLocationIds}
            poiCategories={poiCategories}
            search={search}
            onTabChange={handleTabChange}
            onSortChange={handleSortChange}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </Box>
      </Flex>

      {showMap && (
        <Box
          {...mapStyle}
          position="relative"
          display={{ base: mobileView === 'map' ? 'block' : 'none', xl: 'block' }}
        >
          {mapReady ? (
            <SearchMap
              key={displayDestination}
              data={mapData}
              poiCategories={poiCategories}
              selectedHotelId={selectedId}
              fitToData={false}
              onHotelSelect={handleSelect}
              onAreaChange={handleAreaChange}
            />
          ) : (
            <SearchMapSkeleton />
          )}
          <Box
            display={{ base: mobileView === 'map' ? 'block' : 'none', xl: 'none' }}
            position="absolute"
            zIndex="5"
            bottom="12px"
            left="-16px"
            right="-16px"
          >
            {selectedId && (
              <SearchResults
                destination={displayDestination}
                stay={search.effectiveStay}
                tab={tab}
                sort={sort}
                distance={distance}
                locationIds={currentLocationIds}
                poiCategories={poiCategories}
                search={search}
                onTabChange={handleTabChange}
                onSortChange={handleSortChange}
                selectedId={selectedId}
                onSelect={handleSelect}
                mapMode
              />
            )}
            <Flex justify="center" mt="8px">
              <Button boxShadow="0 2px 12px #0003" onClick={() => setFiltersOpen(true)}>
                Фильтры
              </Button>
            </Flex>
          </Box>
        </Box>
      )}
      <Dialog.Root open={filtersOpen} onOpenChange={({ open }) => setFiltersOpen(open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner alignItems="flex-end">
            <Dialog.Content
              w="100%"
              maxW="100%"
              maxH="85dvh"
              overflowY="auto"
              borderRadius="20px 20px 0 0"
              p="16px"
            >
              <Dialog.Title mb="12px">Фильтры</Dialog.Title>
              <SearchFilters
                distance={distance}
                categories={showMap ? poiCategories : undefined}
                onCategoriesChange={handlePoiCategoriesChange}
                onDistanceChange={handleDistanceChange}
              />
              <Button mt="16px" onClick={() => setFiltersOpen(false)}>
                Показать варианты
              </Button>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Flex>
  );
};
