import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  gap: '16px',
} satisfies SystemStyleObject;

export const listStyle = {
  gap: '12px',
} satisfies SystemStyleObject;

export const messageStyle = {
  color: colors.textMuted,
} satisfies SystemStyleObject;
