import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  gap: '4px',
  minW: '0',
} satisfies SystemStyleObject;

export const labelStyle = {
  fontSize: '12px',
  lineHeight: '16px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const hintStyle = {
  fontSize: '12px',
  lineHeight: '16px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const errorStyle = {
  fontSize: '12px',
  lineHeight: '16px',
  color: colors.danger,
} satisfies SystemStyleObject;
