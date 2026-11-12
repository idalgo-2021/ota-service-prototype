import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const getCardStyle = (selected: boolean) =>
  ({
    p: '10px',
    h: '100%',
    outline: `2px solid ${selected ? colors.primary : 'transparent'}`,
    transition: 'outline-color 0.15s',
  }) satisfies SystemStyleObject;

export const rowStyle = {
  gap: '8px',
  h: '100%',
  flexDirection: 'column',
} satisfies SystemStyleObject;

export const imageStyle = {
  w: '100%',
  h: '130px',
  flexShrink: 0,
  borderRadius: '12px',
  objectFit: 'cover',
  bg: colors.hoverBg,
} satisfies SystemStyleObject;

export const infoStyle = {
  flex: '1',
  minW: '0',
  gap: '2px',
} satisfies SystemStyleObject;

export const typeStyle = {
  fontSize: 'sm',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const nameStyle = {
  fontSize: 'lg',
  fontWeight: 'semibold',
  color: colors.text,
} satisfies SystemStyleObject;

export const detailsStyle = {
  fontSize: 'sm',
  color: colors.text,
} satisfies SystemStyleObject;

export const priceStackStyle = {
  alignItems: 'stretch',
  justifyContent: 'flex-end',
  gap: '2px',
  flexShrink: 0,
} satisfies SystemStyleObject;

export const priceStyle = {
  fontSize: 'lg',
  fontWeight: 'semibold',
  color: colors.text,
  whiteSpace: 'nowrap',
} satisfies SystemStyleObject;

export const totalStyle = {
  fontSize: 'sm',
  color: colors.textMuted,
  whiteSpace: 'nowrap',
} satisfies SystemStyleObject;

export const selectButtonStyle = {
  h: '44px',
  w: '100%',
  mt: '6px',
  borderRadius: '12px',
} satisfies SystemStyleObject;
