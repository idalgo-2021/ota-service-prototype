import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  gap: '16px',
} satisfies SystemStyleObject;

export const titleStyle = {
  fontSize: '22px',
  fontWeight: '700',
  color: colors.text,
} satisfies SystemStyleObject;

// Отступ под сортировками больше общего, чтобы фильтры не сливались с карточками.
export const filtersStyle = {
  gap: '12px',
  pb: '8px',
} satisfies SystemStyleObject;

export const filterStyle = {
  maxW: '480px',
} satisfies SystemStyleObject;

export const getGridStyle = (refreshing: boolean) =>
  ({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '12px',
    opacity: refreshing ? 0.5 : 1,
    transition: 'opacity 0.16s',
  }) satisfies SystemStyleObject;

export const skeletonStyle = {
  h: '360px',
  borderRadius: '16px',
} satisfies SystemStyleObject;

export const messageStyle = {
  color: colors.textMuted,
} satisfies SystemStyleObject;
