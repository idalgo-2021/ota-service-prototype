import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../colors';

export const controlStyle = {
  h: '22px',
} satisfies SystemStyleObject;

export const trackStyle = {
  h: '4px',
  borderRadius: '2px',
  bg: colors.borderLight,
} satisfies SystemStyleObject;

export const rangeStyle = {
  bg: colors.primary,
} satisfies SystemStyleObject;

export const thumbStyle = {
  w: '22px',
  h: '22px',
  borderRadius: '50%',
  bg: colors.primary,
  boxShadow: 'none',
  outline: 'none',
  cursor: 'grab',
  _before: {
    content: '""',
    position: 'absolute',
    inset: '3px',
    borderRadius: '50%',
    bg: colors.white,
  },
} satisfies SystemStyleObject;
