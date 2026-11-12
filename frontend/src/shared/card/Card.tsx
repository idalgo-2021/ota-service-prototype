'use client';

import { Box, type BoxProps } from '@chakra-ui/react';
import { forwardRef } from 'react';
import { cardStyle } from './Card.styles';

export type CardProps = BoxProps;

/** Белая карточка — фон для блоков страницы. */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(props, ref) {
  return <Box ref={ref} {...cardStyle} {...props} />;
});
