import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';
import { HEADER_HEIGHT } from '@/shared/header';

export const rootStyle = {
  w: '100%',
  maxW: '1200px',
  mx: 'auto',
  p: '16px',
  gap: '24px',
} satisfies SystemStyleObject;

export const backLinkStyle = {
  alignSelf: 'flex-start',
  marginBottom: '-12px',
  color: colors.primary,
  fontSize: '15px',
  fontWeight: 500,
  textDecoration: 'none',
};

export const headerStyle = {
  gap: '4px',
} satisfies SystemStyleObject;

export const titleStyle = {
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '36px',
  color: colors.text,
} satisfies SystemStyleObject;

export const subtitleStyle = {
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const subtitleLinkStyle = {
  color: colors.text,
  textDecoration: 'none',
};

export const layoutStyle = {
  gap: '24px',
  alignItems: 'flex-start',
  flexDirection: { base: 'column', lg: 'row' },
} satisfies SystemStyleObject;

export const mainStyle = {
  flex: '1',
  minW: '0',
  w: '100%',
} satisfies SystemStyleObject;

export const asideStyle = {
  w: { base: '100%', lg: '340px' },
  flexShrink: 0,
  position: { lg: 'sticky' },
  top: { lg: `calc(${HEADER_HEIGHT} + 16px)` },
} satisfies SystemStyleObject;

export const messageStyle = {
  color: colors.textMuted,
} satisfies SystemStyleObject;
