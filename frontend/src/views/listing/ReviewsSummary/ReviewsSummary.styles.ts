import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  display: 'grid',
  gridTemplateColumns: {
    base: '1fr',
    md: '180px minmax(0, 1fr)',
    xl: '180px minmax(0, 1fr) 340px',
  },
  gap: { base: '16px', md: '24px' },
  alignItems: 'center',
  p: '16px',
  bg: '#EEF3FD',
  borderRadius: '16px',
  color: colors.text,
} satisfies SystemStyleObject;

export const ratingCardStyle = {
  alignSelf: 'stretch',
  justifyContent: 'center',
  gap: '6px',
  p: '16px',
  bg: 'rgba(255, 255, 255, 0.6)',
  borderRadius: '12px',
} satisfies SystemStyleObject;

export const ratingStyle = {
  fontSize: '40px',
  fontWeight: '700',
  lineHeight: '44px',
} satisfies SystemStyleObject;

export const starsStyle = {
  gap: '2px',
} satisfies SystemStyleObject;

export const getStarStyle = (filled: boolean) =>
  ({
    display: 'flex',
    color: filled ? '#FFB800' : colors.borderMedium,
  }) satisfies SystemStyleObject;

export const countStyle = {
  fontSize: '15px',
} satisfies SystemStyleObject;

export const verifiedStyle = {
  alignItems: 'center',
  gap: '6px',
  color: '#3B7A1E',
  fontSize: '12px',
  fontWeight: '500',
  whiteSpace: 'nowrap',
} satisfies SystemStyleObject;

export const summaryStyle = {
  gap: '8px',
} satisfies SystemStyleObject;

export const summaryTitleStyle = {
  alignItems: 'start',
  gap: '8px',
  fontSize: '17px',
  fontWeight: '600',
} satisfies SystemStyleObject;

export const sparklesStyle = {
  display: 'flex',
  color: '#5B5BF0',
} satisfies SystemStyleObject;

export const summaryTextStyle = {
  fontSize: '14px',
  lineHeight: '22px',
  color: colors.text,
} satisfies SystemStyleObject;

export const summaryToggleStyle = {
  alignSelf: 'flex-start',
  p: 0,
  bg: 'transparent',
  color: colors.primary,
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  _hover: { textDecoration: 'underline' },
  _focusVisible: {
    outline: '2px solid',
    outlineColor: colors.primaryFocusRing,
    outlineOffset: '2px',
  },
} satisfies SystemStyleObject;

export const highlightsStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  listStyle: 'none',
  m: 0,
  p: 0,
} satisfies SystemStyleObject;

export const chipStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  h: '32px',
  px: '12px',
  bg: colors.white,
  borderRadius: '16px',
  fontSize: '13px',
  whiteSpace: 'nowrap',
} satisfies SystemStyleObject;

export const ratingDetailsStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  alignContent: 'flex-start',
  alignSelf: 'start',
  gap: '8px',
  gridColumn: { base: 'auto', md: '2 / -1', xl: 'auto' },
  listStyle: 'none',
  m: 0,
  p: 0,
} satisfies SystemStyleObject;

export const ratingDetailChipStyle = {
  ...chipStyle,
  gap: '7px',
  color: colors.text,
} satisfies SystemStyleObject;

export const ratingDetailIconStyle = {
  display: 'flex',
  color: colors.primary,
} satisfies SystemStyleObject;

export const getChipIconStyle = (tone: 'positive' | 'negative') =>
  ({
    display: 'flex',
    color: tone === 'positive' ? '#3BA55C' : colors.danger,
  }) satisfies SystemStyleObject;
