import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../colors';

export const labelStyle = {
  zIndex: 1,
  position: 'absolute',
  top: '8px',
  left: '16px',
  fontSize: '12px',
  lineHeight: '16px',
  color: colors.textMuted,
  pointerEvents: 'none',
} satisfies SystemStyleObject;
