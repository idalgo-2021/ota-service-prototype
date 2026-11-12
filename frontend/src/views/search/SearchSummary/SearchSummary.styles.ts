import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const triggerStyle = {
  display: 'block',
  w: 'full',
  p: '16px',
  bg: colors.white,
  borderRadius: '16px',
  textAlign: 'left',
  cursor: 'pointer',
  _hover: { bg: colors.hoverBg },
  _focusVisible: { outline: 'none', boxShadow: `0 0 0 2px ${colors.primaryFocusRing}` },
} satisfies SystemStyleObject;

export const stackStyle = {
  gap: '2px',
} satisfies SystemStyleObject;

export const destinationStyle = {
  fontWeight: '500',
  color: colors.primary,
  lineClamp: 2,
} satisfies SystemStyleObject;

export const datesStyle = {
  fontSize: '12px',
  fontWeight: '600',
  color: colors.text,
} satisfies SystemStyleObject;

export const dialogContentStyle = {
  w: '600px',
  maxW: 'calc(100vw - 32px)',
  p: { base: '16px', sm: '20px' },
  bg: colors.white,
  borderRadius: '16px',
  boxShadow: '0 8px 40px rgba(45, 49, 55, 0.3)',
  overflow: 'visible',
} satisfies SystemStyleObject;

export const dialogPositionerStyle = {
  alignItems: 'flex-start',
  pt: { base: '16px', sm: 'min(10vh, 72px)' },
  pb: '16px',
} satisfies SystemStyleObject;

export const dialogHeaderStyle = {
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  mb: '16px',
} satisfies SystemStyleObject;

export const dialogTitleStyle = {
  fontSize: { base: '20px', sm: '22px' },
  fontWeight: '500',
  lineHeight: '28px',
  color: colors.text,
} satisfies SystemStyleObject;

export const closeButtonStyle = {
  display: 'flex',
  flexShrink: 0,
  p: '4px',
  color: colors.textMuted,
  cursor: 'pointer',
  _hover: { color: colors.text },
} satisfies SystemStyleObject;
