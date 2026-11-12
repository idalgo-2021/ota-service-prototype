'use client';

import { Skeleton } from '@chakra-ui/react';
import { Card } from '../card';
import { skeletonRootStyle, skeletonSegmentStyle } from './SegmentedControl.styles';

type SegmentedControlSkeletonProps = {
  /** Сколько сегментов-заглушек показать */
  count?: number;
};

/**
 * Скелетон ряда сегментов, пока варианты ещё загружаются: та же карточка той же высоты,
 * внутри — серые плашки на месте кнопок.
 */
export const SegmentedControlSkeleton = ({ count = 5 }: SegmentedControlSkeletonProps) => (
  <Card {...skeletonRootStyle} role="status" aria-label="Загрузка вариантов">
    {Array.from({ length: count }, (_, index) => (
      <Skeleton key={index} {...skeletonSegmentStyle} />
    ))}
  </Card>
);
