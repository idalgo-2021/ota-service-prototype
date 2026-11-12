import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';
import { floatingPanelStyle, focusRingStyle } from '../SearchMap.styles';

export const formStyle = {
  ...floatingPanelStyle,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  w: '100%',
  maxW: '280px',
  ml: 'auto',
  p: '5px 12px',
  _focusWithin: focusRingStyle,
} satisfies SystemStyleObject;

export const submitButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  w: '24px',
  h: '24px',
  cursor: 'pointer',
  _disabled: { opacity: 0.4, cursor: 'progress' },
} satisfies SystemStyleObject;

export const inputStyle = {
  w: '100%',
  minW: '0',
  p: '6px 8px',
  outline: 'none',
  fontSize: '13px',
} satisfies SystemStyleObject;

export const suggestionsStyle = {
  ...floatingPanelStyle,
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: '0',
  right: '0',
  maxH: '320px',
  overflowY: 'auto',
  p: '4px',
  listStyle: 'none',
} satisfies SystemStyleObject;

export const suggestionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  p: '8px 10px',
  borderRadius: '8px',
  cursor: 'pointer',
  _hover: { bg: colors.hoverBg },
  _selected: { bg: colors.primarySoft },
} satisfies SystemStyleObject;

export const suggestionNameStyle = {
  fontSize: '13px',
  fontWeight: 'semibold',
} satisfies SystemStyleObject;

export const suggestionAddressStyle = {
  fontSize: '11px',
  color: colors.textMuted,
  lineClamp: 2,
} satisfies SystemStyleObject;

export const suggestionKindStyle = {
  ml: '6px',
  px: '6px',
  py: '1px',
  borderRadius: '4px',
  bg: colors.primarySoft,
  color: colors.primary,
  fontSize: '10px',
  fontWeight: 'medium',
  verticalAlign: 'middle',
} satisfies SystemStyleObject;
