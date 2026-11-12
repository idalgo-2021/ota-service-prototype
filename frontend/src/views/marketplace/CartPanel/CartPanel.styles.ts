import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  color: colors.text,
} satisfies SystemStyleObject;

export const titleStyle = {
  fontSize: '18px',
  fontWeight: '600',
} satisfies SystemStyleObject;

export const messageStyle = {
  fontSize: 'sm',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const totalRowStyle = {
  justifyContent: 'space-between',
  alignItems: 'baseline',
  pt: '4px',
} satisfies SystemStyleObject;

export const totalStyle = {
  fontSize: 'lg',
  fontWeight: 'semibold',
} satisfies SystemStyleObject;

export const checkoutStyle = {
  w: '100%',
  h: '48px',
  borderRadius: '12px',
} satisfies SystemStyleObject;

export const errorStyle = {
  px: '12px',
  py: '8px',
  bg: '#FDECEB',
  color: colors.danger,
  borderRadius: '12px',
  fontSize: '14px',
} satisfies SystemStyleObject;

export const successStyle = {
  px: '12px',
  py: '8px',
  bg: '#E6F6DE',
  color: '#3B7A1E',
  borderRadius: '12px',
  fontSize: '14px',
} satisfies SystemStyleObject;

export const linkStyle = {
  color: colors.primary,
  fontWeight: 500,
  textDecoration: 'none',
};
