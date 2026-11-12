import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const cardStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  color: colors.text,
} satisfies SystemStyleObject;

export const lineStyle = {
  gap: '4px',
} satisfies SystemStyleObject;

export const titleStyle = {
  fontSize: 'lg',
  fontWeight: 'semibold',
} satisfies SystemStyleObject;

export const mutedStyle = {
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const unitLineStyle = {
  justifyContent: 'space-between',
  gap: '12px',
} satisfies SystemStyleObject;

export const sectionTitleStyle = {
  fontWeight: 'semibold',
} satisfies SystemStyleObject;

export const getTotalStyle = (strong: boolean) =>
  ({
    fontWeight: strong ? 'semibold' : 'normal',
  }) satisfies SystemStyleObject;

export const hintStyle = {
  fontSize: 'sm',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const errorStyle = {
  fontSize: 'sm',
  color: colors.danger,
} satisfies SystemStyleObject;

export const bookButtonStyle = {
  w: '100%',
  h: '52px',
  _disabled: { opacity: 0.4, cursor: 'default' },
} satisfies SystemStyleObject;
