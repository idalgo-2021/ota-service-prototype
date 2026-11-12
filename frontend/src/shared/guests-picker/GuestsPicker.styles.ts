import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../colors';

export const rootStyle = {
  position: 'relative',
  gap: '0',
  bg: colors.white,
  borderRadius: '16px',
  _focusWithin: { boxShadow: `0 0 0 2px ${colors.primaryFocusRing}` },
} satisfies SystemStyleObject;

export const triggerStyle = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  h: '52px',
  pt: '20px',
  px: '16px',
  cursor: 'pointer',
  outline: 'none',
} satisfies SystemStyleObject;

export const valueStyle = {
  fontSize: '14px',
  fontWeight: '500',
  lineHeight: '20px',
  color: colors.text,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} satisfies SystemStyleObject;

export const panelStyle = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  right: '0',
  zIndex: 20,
  w: '300px',
  maxW: 'calc(100vw - 32px)',
  gap: '16px',
  p: '16px',
  bg: colors.white,
  borderRadius: '16px',
  boxShadow: 'lg',
} satisfies SystemStyleObject;
