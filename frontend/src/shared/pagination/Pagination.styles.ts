import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../colors';

export const rootStyle = {
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '8px',
} satisfies SystemStyleObject;

export const rangeStyle = {
  mr: '8px',
  fontSize: '14px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const buttonStyle = {
  h: '36px',
  minW: '0',
  px: '12px',
  borderRadius: '12px',
  fontSize: '14px',
} satisfies SystemStyleObject;
