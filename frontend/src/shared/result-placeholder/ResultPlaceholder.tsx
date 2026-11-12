'use client';

import { Flex, Skeleton, Stack } from '@chakra-ui/react';
import { Card } from '@/shared/card';
import {
  actionBlockStyle,
  cardStyle,
  detailLineStyle,
  imageStyle,
  infoStyle,
  rowStyle,
  subtitleLineStyle,
  titleLineStyle,
} from './ResultPlaceholder.styles';

/**
 * Скелетон карточки отеля.
 */
export const ResultPlaceholder = () => (
  <Card {...cardStyle}>
    <Flex {...rowStyle}>
      <Skeleton {...imageStyle} />
      <Stack {...infoStyle}>
        <Skeleton {...titleLineStyle} />
        <Skeleton {...subtitleLineStyle} />
        <Skeleton {...detailLineStyle} />
        <Skeleton {...actionBlockStyle} />
      </Stack>
    </Flex>
  </Card>
);
