import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const cardStyle = {
  p: '16px',
} satisfies SystemStyleObject;

export const listStyle = {
  gap: '20px',
} satisfies SystemStyleObject;

export const favoritesToggleStyle = {
  flexDirection: 'row-reverse',
  justifyContent: 'space-between',
} satisfies SystemStyleObject;

export const favoritesLabelStyle = {
  fontWeight: 'semibold',
  color: colors.text,
} satisfies SystemStyleObject;

export const roomsListStyle = {
  gap: 2,
} satisfies SystemStyleObject;

export const distanceListStyle = {
  gap: 2,
} satisfies SystemStyleObject;
