import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  w: '100%',
  maxW: '960px',
  mx: 'auto',
  p: '16px',
  gap: '16px',
} satisfies SystemStyleObject;

export const headerStyle = {
  gap: '2px',
} satisfies SystemStyleObject;

export const titleStyle = {
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '36px',
  color: colors.text,
  overflowWrap: 'anywhere',
} satisfies SystemStyleObject;

export const sinceStyle = {
  fontSize: '14px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const messageStyle = {
  color: colors.textMuted,
} satisfies SystemStyleObject;
