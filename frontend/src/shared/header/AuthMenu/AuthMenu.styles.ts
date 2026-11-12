import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../../colors';

export const rootStyle = {
  position: 'relative',
  ml: '0',
} satisfies SystemStyleObject;

export const triggerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  h: { base: '32px', sm: '36px' },
  maxW: '190px',
  pl: { base: '4px', sm: '6px' },
  pr: { base: '4px', sm: '6px', md: '12px' },
  bg: colors.primarySoft,
  color: colors.primary,
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: '500',
  lineHeight: '20px',
  cursor: 'pointer',
  outline: 'none',
  transition: 'background-color 0.16s, box-shadow 0.16s',
  _hover: { bg: colors.hoverBg },
  _focusVisible: { boxShadow: `0 0 0 2px ${colors.primaryFocusRing}` },
} satisfies SystemStyleObject;

export const triggerTextStyle = {
  display: { base: 'none', md: 'block' },
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} satisfies SystemStyleObject;

export const panelStyle = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  right: '0',
  zIndex: 30,
  w: '320px',
  maxW: 'calc(100vw - 32px)',
  p: '16px',
  bg: colors.white,
  color: colors.text,
  borderRadius: '16px',
  boxShadow: '0 8px 40px rgba(45, 49, 55, 0.3)',
} satisfies SystemStyleObject;

export const accountCaptionStyle = {
  fontSize: '14px',
  lineHeight: '18px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const accountEmailStyle = {
  mt: '2px',
  mb: '16px',
  fontSize: '16px',
  fontWeight: '500',
  lineHeight: '22px',
  wordBreak: 'break-all',
} satisfies SystemStyleObject;

export const menuLinkStyle = {
  w: '100%',
  h: '48px',
  mb: '8px',
  borderRadius: '12px',
} satisfies SystemStyleObject;

export const signOutStyle = {
  w: '100%',
  h: '48px',
  borderRadius: '12px',
} satisfies SystemStyleObject;
