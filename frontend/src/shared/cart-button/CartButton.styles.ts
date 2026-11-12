import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../colors';

// Обе формы одного размера, чтобы при добавлении в корзину вёрстка карточки не прыгала.
// Ширину задаёт место в карточке: в узкой колонке фиксированная не вмещает подпись.
const sizeStyle = {
  w: '100%',
  h: '40px',
  flexShrink: 0,
  borderRadius: '12px',
} satisfies SystemStyleObject;

export const addStyle = {
  ...sizeStyle,
  fontSize: '14px',
} satisfies SystemStyleObject;

export const stepperStyle = {
  ...sizeStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  p: '4px',
  bg: colors.primarySoft,
  color: colors.primary,
} satisfies SystemStyleObject;

export const stepStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  w: '32px',
  h: '32px',
  flexShrink: 0,
  borderRadius: '8px',
  fontSize: '18px',
  fontWeight: '500',
  lineHeight: '1',
  cursor: 'pointer',
  outline: 'none',
  transition: 'background-color 0.16s, box-shadow 0.16s',
  _hover: { bg: colors.white },
  _focusVisible: { boxShadow: `0 0 0 2px ${colors.primaryFocusRing}` },
  _disabled: { opacity: 0.4, cursor: 'default', _hover: { bg: 'transparent' } },
} satisfies SystemStyleObject;

export const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minW: '0',
} satisfies SystemStyleObject;

export const countStyle = {
  fontSize: '15px',
  fontWeight: '600',
  lineHeight: '16px',
} satisfies SystemStyleObject;

export const captionStyle = {
  fontSize: '11px',
  lineHeight: '12px',
  whiteSpace: 'nowrap',
} satisfies SystemStyleObject;
