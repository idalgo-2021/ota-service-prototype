import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../../colors';

export const itemStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
} satisfies SystemStyleObject;

export const controlStyle = {
  w: '16px',
  h: '16px',
  minW: '16px',
  borderRadius: '100%',
  border: `1px solid ${colors.borderLight}`,
  bg: colors.white,
  transition: 'border-color 0.16s, border-width 0.16s',
  _checked: { border: `4px solid ${colors.primary}` },
} satisfies SystemStyleObject;

export const textStyle = {
  fontSize: '14px',
  fontWeight: 'normal',
  color: colors.text,
} satisfies SystemStyleObject;
