import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';
import { inputStyle } from '@/shared/input';

export const cardStyle = {
  display: 'flex',
  flexDirection: 'column',
  p: '8px',
  color: colors.text,
} satisfies SystemStyleObject;

export const imageStyle = {
  w: '100%',
  h: '160px',
  flexShrink: 0,
  borderRadius: '12px',
  objectFit: 'cover',
  bg: colors.hoverBg,
} satisfies SystemStyleObject;

export const bodyStyle = {
  flex: '1',
  gap: '6px',
  p: '8px',
} satisfies SystemStyleObject;

export const typeStyle = {
  fontSize: 'sm',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const titleStyle = {
  fontSize: '17px',
  fontWeight: '600',
  lineHeight: '22px',
} satisfies SystemStyleObject;

export const descriptionStyle = {
  fontSize: 'sm',
  lineClamp: 2,
} satisfies SystemStyleObject;

export const factsStyle = {
  fontSize: 'sm',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const dateSelectStyle = {
  ...inputStyle,
  h: '40px',
  pe: '32px',
  fontSize: '14px',
  cursor: 'pointer',
} satisfies SystemStyleObject;

export const footerStyle = {
  mt: 'auto',
  pt: '8px',
  gap: '8px',
} satisfies SystemStyleObject;

export const priceRowStyle = {
  alignItems: 'baseline',
  flexWrap: 'wrap',
  columnGap: '6px',
} satisfies SystemStyleObject;

export const priceStyle = {
  fontSize: 'lg',
  fontWeight: 'semibold',
  whiteSpace: 'nowrap',
} satisfies SystemStyleObject;
