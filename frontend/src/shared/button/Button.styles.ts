import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../colors';

export const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  h: '56px',
  minW: '56px',
  px: '16px',
  bg: colors.primary,
  color: colors.white,
  borderRadius: '16px',
  border: '1px solid transparent',
  fontSize: '16px',
  fontWeight: '500',
  lineHeight: '24px',
  boxShadow: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.16s, color 0.16s, box-shadow 0.16s',
  _hover: { bg: colors.primaryHover },
  _active: { bg: colors.primaryHover },
} satisfies SystemStyleObject;

export const softButtonStyle = {
  bg: colors.primarySoft,
  color: colors.primary,
  _hover: { bg: colors.hoverBg },
  _active: { bg: colors.hoverBg },
  _disabled: { opacity: 0.4, cursor: 'default', _hover: { bg: colors.primarySoft } },
} satisfies SystemStyleObject;
