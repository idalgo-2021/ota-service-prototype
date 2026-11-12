import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';
import { mapColors } from './constants';

/**
 * Карта на странице занимает весь блок-родитель и берёт у него скругление углов:
 * размер и форму задаёт страница. Так же устроена заглушка, пока код карты загружается.
 */
const collapsedLayoutStyle = {
  position: 'relative',
  h: '100%',
  borderRadius: 'inherit',
} satisfies SystemStyleObject;

export const getRootStyle = (expanded: boolean) => {
  const layout = expanded
    ? {
        position: 'fixed',
        inset: { base: '0', md: '16px' },
        zIndex: 2000,
        h: { base: '100dvh', md: 'calc(100dvh - 32px)' },
        borderRadius: { base: '0', md: '16px' },
      }
    : collapsedLayoutStyle;

  return {
    ...layout,
    overflow: 'hidden',
    minW: '0',
    isolation: 'isolate',
    bg: mapColors.background,
    color: colors.text,
  } satisfies SystemStyleObject;
};

export const loadingStyle = {
  h: '100%',
} satisfies SystemStyleObject;

export const skeletonStyle = collapsedLayoutStyle;

export const hintStyle = {
  position: 'absolute',
  top: 'calc(118px + env(safe-area-inset-top, 0px))',
  left: 'calc(12px + env(safe-area-inset-left, 0px))',
  right: 'calc(68px + env(safe-area-inset-right, 0px))',
  zIndex: 2,
  p: '10px 12px',
  bg: colors.white,
  borderRadius: '10px',
  boxShadow: `0 2px 12px ${mapColors.shadow}`,
  fontSize: '12px',
} satisfies SystemStyleObject;

/** Белая «плашка» поверх карты: кнопки и поле поиска в тулбаре. */
export const floatingPanelStyle = {
  pointerEvents: 'auto',
  bg: colors.white,
  borderRadius: '12px',
  boxShadow: `0 2px 12px ${mapColors.shadow}`,
} satisfies SystemStyleObject;

export const focusRingStyle = {
  outline: `3px solid ${colors.primary}`,
  outlineOffset: '2px',
} satisfies SystemStyleObject;

export const nearbyMapButtonStyle = {
  position: 'absolute',
  zIndex: 4,
  top: '14px',
  left: '14px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '9px',
  minH: '46px',
  px: '15px',
  borderRadius: '13px',
  bg: colors.white,
  color: '#101722',
  boxShadow: `0 6px 20px ${mapColors.shadow}`,
  fontSize: '14px',
  fontWeight: '750',
  cursor: 'pointer',
  _hover: { bg: '#f7f9f6' },
  _focusVisible: focusRingStyle,
} satisfies SystemStyleObject;
