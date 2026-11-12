import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../colors';

export const rootStyle = {
  gap: '8px',
} satisfies SystemStyleObject;

export const controlStyle = {
  w: '16px',
  h: '16px',
  minW: '16px',
  borderRadius: '5px',
  border: `1px solid ${colors.borderLight}`,
  bg: colors.white,
  color: colors.white,
  cursor: 'pointer',
  transition: 'background-color 0.16s, border-color 0.16s',
  _checked: { bg: colors.primary, borderColor: colors.primary },
} satisfies SystemStyleObject;

export const indicatorStyle = {
  w: '12px',
  h: '12px',
  strokeWidth: '5px',
} satisfies SystemStyleObject;

export const labelStyle = {
  fontSize: '14px',
  fontWeight: 'normal',
  color: colors.text,
  cursor: 'pointer',
} satisfies SystemStyleObject;
