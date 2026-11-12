'use client';

import { Stack, Text } from '@chakra-ui/react';
import { rootStyle, titleStyle } from './Section.styles';

/** Блок с полужирным заголовком и содержимым под ним. */
export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Stack {...rootStyle}>
    <Text {...titleStyle}>{title}</Text>
    {children}
  </Stack>
);
