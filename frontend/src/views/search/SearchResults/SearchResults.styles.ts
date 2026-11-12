import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  gap: '16px',
} satisfies SystemStyleObject;

export const summaryTextStyle = {
  fontWeight: 'semibold',
  color: colors.text,
} satisfies SystemStyleObject;

export const headerStyle = {
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '8px 16px',
} satisfies SystemStyleObject;

export const listStyle = {
  gap: '16px',
} satisfies SystemStyleObject;

export const messageStyle = {
  color: colors.textMuted,
} satisfies SystemStyleObject;
