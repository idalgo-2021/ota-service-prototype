import type { SystemStyleObject } from '@chakra-ui/react';
import type { CSSProperties } from 'react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  flex: '1',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  bg: colors.mint,
  px: 4,
} satisfies SystemStyleObject;

export const headingStyle = {
  w: 'full',
  maxW: '1100px',
  fontSize: { base: '32px', md: '48px' },
  fontWeight: '700',
  lineHeight: '1.1',
  color: colors.text,
} satisfies SystemStyleObject;

export const experiencesLinkStyle = {
  display: 'flex',
  width: '100%',
  maxWidth: '1100px',
  gap: '12px',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderRadius: '16px',
  color: colors.text,
  background: 'rgba(255, 255, 255, 0.72)',
  textDecoration: 'none',
} satisfies CSSProperties;
