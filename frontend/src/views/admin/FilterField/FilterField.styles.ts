import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  gap: '4px',
  minW: '160px',
} satisfies SystemStyleObject;

export const captionStyle = {
  fontSize: '12px',
  lineHeight: '16px',
  color: colors.textMuted,
} satisfies SystemStyleObject;
