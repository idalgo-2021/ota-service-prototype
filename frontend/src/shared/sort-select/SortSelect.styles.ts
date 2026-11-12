import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../colors';

export const rootStyle = {
  position: 'relative',
  w: 'auto',
} satisfies SystemStyleObject;

export const iconStyle = {
  position: 'absolute',
  left: '14px',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  color: colors.primary,
  pointerEvents: 'none',
  zIndex: 1,
} satisfies SystemStyleObject;

export const fieldStyle = {
  h: '40px',
  ps: '40px',
  pe: '36px',
  bg: colors.white,
  color: colors.primary,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  _focusVisible: { outline: 'none', boxShadow: `0 0 0 2px ${colors.primaryFocusRing}` },
} satisfies SystemStyleObject;
