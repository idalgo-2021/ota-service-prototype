import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../../colors';

export const inputStyle = {
  h: '40px',
  px: '12px',
  bg: colors.white,
  border: `1px solid ${colors.borderMedium}`,
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: '500',
  lineHeight: '20px',
  color: colors.text,
  outline: 'none',
  transition: 'box-shadow 0.16s, border-color 0.16s',
  _placeholder: { color: colors.textMuted },
  _focusVisible: {
    borderColor: colors.borderMedium,
    boxShadow: `0 0 0 2px ${colors.primaryFocusRing}`,
  },
} satisfies SystemStyleObject;
