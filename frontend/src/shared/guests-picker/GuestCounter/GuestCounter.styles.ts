import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../../colors';

export const rootStyle = {
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
} satisfies SystemStyleObject;

export const textStyle = {
  gap: '0',
} satisfies SystemStyleObject;

export const controlsStyle = {
  alignItems: 'center',
  gap: '12px',
} satisfies SystemStyleObject;

export const labelStyle = {
  fontSize: '16px',
  fontWeight: '500',
  color: colors.text,
} satisfies SystemStyleObject;

export const hintStyle = {
  fontSize: '13px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const buttonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  w: '32px',
  h: '32px',
  bg: colors.primarySoft,
  color: colors.primary,
  borderRadius: '10px',
  fontSize: '18px',
  lineHeight: '1',
  cursor: 'pointer',
  transition: 'background-color 0.16s',
  _hover: { bg: colors.hoverBg },
  _disabled: { opacity: 0.4, cursor: 'default', _hover: { bg: colors.primarySoft } },
} satisfies SystemStyleObject;

export const valueStyle = {
  minW: '20px',
  textAlign: 'center',
  fontSize: '16px',
  fontWeight: '500',
  color: colors.text,
} satisfies SystemStyleObject;
