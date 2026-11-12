import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../colors';

export const contentStyle = {
  w: '420px',
  maxW: 'calc(100vw - 32px)',
  p: '20px',
  bg: colors.white,
  borderRadius: '16px',
  boxShadow: '0 8px 40px rgba(45, 49, 55, 0.3)',
} satisfies SystemStyleObject;

export const titleStyle = {
  mb: '16px',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '24px',
  color: colors.text,
} satisfies SystemStyleObject;

export const bodyStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  p: '0',
} satisfies SystemStyleObject;

export const captionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  fontSize: '12px',
  lineHeight: '16px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const textareaStyle = {
  px: '12px',
  py: '8px',
  border: `1px solid ${colors.borderMedium}`,
  borderRadius: '12px',
  fontSize: '15px',
  color: colors.text,
  resize: 'vertical',
  _focusVisible: { outline: 'none', boxShadow: `0 0 0 2px ${colors.primaryFocusRing}` },
} satisfies SystemStyleObject;

export const errorStyle = {
  fontSize: '14px',
  color: colors.danger,
} satisfies SystemStyleObject;

export const footerStyle = {
  justifyContent: 'flex-end',
  gap: '8px',
  mt: '20px',
} satisfies SystemStyleObject;

export const backButtonStyle = {
  h: '40px',
  borderRadius: '12px',
} satisfies SystemStyleObject;

export const confirmButtonStyle = {
  h: '40px',
  borderRadius: '12px',
  bg: colors.danger,
  _hover: { bg: colors.danger, opacity: 0.9 },
  _active: { bg: colors.danger },
  _disabled: { opacity: 0.4, cursor: 'default' },
} satisfies SystemStyleObject;
