'use client';

import { Box, chakra, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { Button } from '@/shared/button';
import { MapIcon } from '@/shared/icons';
import { SearchMapSkeleton } from '@/views/search';
import {
  addressStyle,
  closeButtonStyle,
  desktopMapStyle,
  headStyle,
  mapStyle,
  mobileButtonStyle,
  popupHeaderStyle,
  popupMapStyle,
  popupStyle,
  rootStyle,
  titleStyle,
} from './ListingMap.styles';
import { useController } from './useController';

// Карта работает только в браузере, как и на странице поиска.
const SearchMap = dynamic(() => import('@/views/search').then((module) => module.SearchMap), {
  ssr: false,
  loading: SearchMapSkeleton,
});

/** Якорь блока: к нему ведёт кнопка «На карте» в шапке объекта. */
export const LISTING_MAP_ID = 'map';

type ListingMapProps = {
  id: string;
  title: string;
  city: string;
  address?: string;
  latitude: number;
  longitude: number;
  mobileOpen: boolean;
  onMobileOpen: () => void;
  onMobileClose: () => void;
};

/**
 * Блок «На карте»: заголовок с адресом и та же интерактивная карта, что в поиске, с меткой
 * объекта — она выделена и карта открыта на ней. На мобильном карта появляется
 * в полноэкранном окне, на широком экране видна в правой колонке.
 */
export const ListingMap = ({
  id,
  title,
  city,
  address,
  latitude,
  longitude,
  mobileOpen,
  onMobileOpen,
  onMobileClose,
}: ListingMapProps) => {
  const { data } = useController(id, title, city, latitude, longitude);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, [mobileOpen]);

  return (
    <Stack as="section" id={LISTING_MAP_ID} {...rootStyle}>
      <Button appearance="soft" onClick={onMobileOpen} {...mobileButtonStyle}>
        <MapIcon size={20} />
        Посмотреть на карте
      </Button>
      <Box {...desktopMapStyle}>
        <Stack {...headStyle}>
          <Heading as="h2" {...titleStyle}>
            На карте
          </Heading>
          {address && <Text {...addressStyle}>{address}</Text>}
        </Stack>
        <Box {...mapStyle}>
          <SearchMap data={data} selectedHotelId={id} compactControls />
        </Box>
      </Box>
      {mobileOpen && (
        <chakra.dialog
          ref={dialogRef}
          aria-label={`Карта: ${title}`}
          onCancel={(event) => {
            event.preventDefault();
            onMobileClose();
          }}
          {...popupStyle}
        >
          <Flex {...popupHeaderStyle}>
            <Heading as="h2" {...titleStyle}>
              На карте
            </Heading>
            <chakra.button
              type="button"
              aria-label="Закрыть карту"
              onClick={onMobileClose}
              {...closeButtonStyle}
            >
              <chakra.svg viewBox="0 0 24 24" w="22px" h="22px" aria-hidden="true">
                <path
                  d="M5 5 19 19M19 5 5 19"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </chakra.svg>
            </chakra.button>
          </Flex>
          <Box {...popupMapStyle}>
            <SearchMap data={data} selectedHotelId={id} hideExpandControl />
          </Box>
        </chakra.dialog>
      )}
    </Stack>
  );
};
