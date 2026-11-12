import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';
import { mapColors } from '../constants';

const panelStyle = {
  bg: colors.white,
  borderRadius: '10px',
  boxShadow: `0 2px 10px ${mapColors.shadow}`,
} satisfies SystemStyleObject;

export const rootStyle = {
  position: 'absolute',
  zIndex: 2,
  top: 'calc(118px + env(safe-area-inset-top, 0px))',
  right: 'calc(12px + env(safe-area-inset-right, 0px))',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
} satisfies SystemStyleObject;

export const zoomGroupStyle = {
  ...panelStyle,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
} satisfies SystemStyleObject;

const baseButtonStyle = {
  display: 'grid',
  placeItems: 'center',
  w: '44px',
  h: '44px',
  cursor: 'pointer',
  transition: 'background-color 0.16s, color 0.16s',
  _hover: { bg: colors.primarySoft },
  _active: { bg: `${colors.primary}24` },
  _focusVisible: {
    outline: `3px solid ${colors.primaryFocusRing}`,
    outlineOffset: '-3px',
  },
} satisfies SystemStyleObject;

export const zoomButtonStyle = {
  ...baseButtonStyle,
  color: colors.text,
  _notFirst: { borderTop: `1px solid ${colors.borderLight}` },
} satisfies SystemStyleObject;

export const recenterButtonStyle = {
  ...baseButtonStyle,
  ...panelStyle,
  color: colors.primary,
} satisfies SystemStyleObject;
