import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const itemRowStyle = {
  alignItems: 'center',
  gap: '10px',
  fontSize: '14px',
  width: '100%',
} satisfies SystemStyleObject;

export const itemDateStyle = {
  color: colors.textMuted,
  fontSize: '12px',
} satisfies SystemStyleObject;
