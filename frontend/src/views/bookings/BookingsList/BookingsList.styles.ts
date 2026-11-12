import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  gap: '16px',
} satisfies SystemStyleObject;

export const successStyle = {
  px: '16px',
  py: '12px',
  bg: '#E6F6DE',
  color: '#3B7A1E',
  borderRadius: '12px',
  fontWeight: '500',
} satisfies SystemStyleObject;

export const warningStyle = {
  px: '16px',
  py: '12px',
  bg: '#FFF4D6',
  color: '#8A5A00',
  borderRadius: '12px',
  fontWeight: '500',
} satisfies SystemStyleObject;

export const successLinkStyle = {
  color: 'inherit',
  textDecoration: 'underline',
};

export const listStyle = {
  gap: '12px',
} satisfies SystemStyleObject;

export const messageStyle = {
  color: colors.textMuted,
} satisfies SystemStyleObject;
