import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  w: '100%',
  minH: '100dvh',
  maxW: '1520px',
  mx: 'auto',
  p: { base: '18px', md: '28px', xl: '36px' },
  gap: '24px',
  bg: '#f5f5f7',
} satisfies SystemStyleObject;

export const titleStyle = {
  fontSize: { base: '28px', md: '32px' },
  fontWeight: '650',
  lineHeight: '1.1',
  letterSpacing: '-0.035em',
  color: colors.text,
} satisfies SystemStyleObject;

export const layoutStyle = {
  flexDirection: { base: 'column', lg: 'row' },
  alignItems: { base: 'stretch', md: 'flex-start' },
  gap: { base: '14px', lg: '24px' },
} satisfies SystemStyleObject;

export const sidebarStyle = {
  flexShrink: 0,
  w: { base: '100%', lg: '248px' },
  p: '8px',
  border: '1px solid #e5e5ea',
  borderRadius: '16px',
  bg: 'white',
  alignSelf: 'flex-start',
  position: { lg: 'sticky' },
  top: { lg: '24px' },
} satisfies SystemStyleObject;

export const navStyle = {
  display: 'flex',
  flexDirection: { base: 'row', md: 'column' },
  gap: { base: '12px', md: '4px' },
  // На узком экране разделов много: меню прокручивается вбок, а не переносится.
  overflowX: { base: 'auto', md: 'visible' },
} satisfies SystemStyleObject;

export const navGroupStyle = {
  flexDirection: { base: 'row', md: 'column' },
  flexShrink: 0,
  gap: '4px',
} satisfies SystemStyleObject;

export const navGroupTitleStyle = {
  display: { base: 'none', md: 'block' },
  px: '12px',
  pb: '2px',
  fontSize: '12px',
  fontWeight: '500',
  color: colors.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
} satisfies SystemStyleObject;

export const getNavLinkStyle = (active: boolean) =>
  ({
    display: 'flex',
    alignItems: 'center',
    h: '40px',
    px: '12px',
    flexShrink: 0,
    bg: active ? colors.primarySoft : 'transparent',
    color: active ? colors.primary : colors.text,
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: active ? '600' : '500',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    outline: 'none',
    transition: 'background-color 0.16s, box-shadow 0.16s',
    _hover: { bg: active ? colors.primarySoft : colors.hoverBg },
    _focusVisible: { boxShadow: `0 0 0 2px ${colors.primaryFocusRing}` },
  }) satisfies SystemStyleObject;

export const contentStyle = {
  flex: 1,
  minW: 0,
  gap: '14px',
} satisfies SystemStyleObject;

export const sectionTitleStyle = {
  fontSize: '20px',
  fontWeight: '600',
  lineHeight: '28px',
  color: colors.text,
} satisfies SystemStyleObject;

export const messageStyle = {
  color: colors.textMuted,
} satisfies SystemStyleObject;
