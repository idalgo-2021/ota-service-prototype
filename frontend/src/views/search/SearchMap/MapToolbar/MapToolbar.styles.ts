import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';
import { floatingPanelStyle, focusRingStyle } from '../SearchMap.styles';

export const rootStyle = {
  position: 'absolute',
  // Выше строки-подсказки, чтобы список подсказок поиска перекрывал её.
  zIndex: 3,
  top: 'calc(12px + env(safe-area-inset-top, 0px))',
  left: 'calc(12px + env(safe-area-inset-left, 0px))',
  right: 'calc(12px + env(safe-area-inset-right, 0px))',
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  gap: '10px',
  pointerEvents: 'none',
} satisfies SystemStyleObject;

export const controlStyle = {
  ...floatingPanelStyle,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  p: '11px 13px',
  fontSize: '12px',
  fontWeight: 'semibold',
  cursor: 'pointer',
  _pressed: { color: colors.primary, bg: colors.primarySoft },
  _focusVisible: focusRingStyle,
} satisfies SystemStyleObject;

export const controlIconStyle = {
  fontSize: '20px',
  lineHeight: '1',
} satisfies SystemStyleObject;
