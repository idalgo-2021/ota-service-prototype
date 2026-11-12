'use client';

import { chakra } from '@chakra-ui/react';
import { getBadgeStyle, type StatusTone } from './StatusBadge.styles';

type StatusBadgeProps = {
  tone: StatusTone;
  children: React.ReactNode;
};

/**
 * Цветная плашка со статусом: цвет говорит, ждёт ли запись действий, в работе ли она,
 * завершена или отменена.
 */
export const StatusBadge = ({ tone, children }: StatusBadgeProps) => (
  <chakra.span {...getBadgeStyle(tone)}>{children}</chakra.span>
);
