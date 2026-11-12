import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  gap: '6px',
  py: '10px',
  borderBottom: `1px solid ${colors.borderLight}`,
} satisfies SystemStyleObject;

export const headStyle = {
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '8px',
} satisfies SystemStyleObject;

export const productStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  minWidth: 0,
  color: 'inherit',
  textDecoration: 'none',
} as const;

export const pictureStyle = {
  display: 'block',
  w: '52px',
  h: '52px',
  flexShrink: 0,
  borderRadius: '10px',
  objectFit: 'cover',
  bg: colors.hoverBg,
} satisfies SystemStyleObject;

export const nameStyle = {
  fontSize: '15px',
  fontWeight: '500',
  lineHeight: '20px',
  _hover: { color: colors.primary },
} satisfies SystemStyleObject;

export const dateStyle = {
  fontSize: 'sm',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const removeStyle = {
  flexShrink: 0,
  color: colors.textMuted,
  fontSize: '13px',
  cursor: 'pointer',
  _hover: { color: colors.danger },
  _disabled: { opacity: 0.4, cursor: 'default', _hover: { color: colors.textMuted } },
} satisfies SystemStyleObject;

export const footStyle = {
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
} satisfies SystemStyleObject;

export const stepperStyle = {
  alignItems: 'center',
  gap: '4px',
} satisfies SystemStyleObject;

export const stepButtonStyle = {
  w: '28px',
  h: '28px',
  bg: colors.primarySoft,
  color: colors.primary,
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: '500',
  cursor: 'pointer',
  _hover: { bg: colors.hoverBg },
  _disabled: { opacity: 0.4, cursor: 'default' },
} satisfies SystemStyleObject;

export const quantityStyle = {
  minW: '24px',
  textAlign: 'center',
  fontWeight: '500',
} satisfies SystemStyleObject;

export const priceStyle = {
  fontWeight: '500',
  whiteSpace: 'nowrap',
} satisfies SystemStyleObject;
