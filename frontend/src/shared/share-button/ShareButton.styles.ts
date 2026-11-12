import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../colors';

export const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  h: '40px',
  px: '14px',
  bg: colors.white,
  color: colors.text,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: '500',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  outline: 'none',
  transition: 'background-color 0.16s, box-shadow 0.16s',
  _hover: { bg: colors.hoverBg },
  _focusVisible: { boxShadow: `0 0 0 2px ${colors.primaryFocusRing}` },
} satisfies SystemStyleObject;
