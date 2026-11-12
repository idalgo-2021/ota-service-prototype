import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../../colors';

export const containerStyle = {
  position: 'relative',
  bg: colors.white,
  borderRadius: '16px',
  transition: 'box-shadow 0.16s',
  _focusWithin: { boxShadow: `0 0 0 2px ${colors.primaryFocusRing}` },
} satisfies SystemStyleObject;

export const getInputStyle = (showClear: boolean) =>
  ({
    h: '52px',
    pt: '20px',
    pb: '0',
    pl: '16px',
    pr: showClear ? '44px' : '16px',
    bg: 'transparent',
    border: 'none',
    borderRadius: '18px',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '20px',
    color: colors.text,
    outline: 'none',
    _placeholder: { color: colors.textMuted },
    _focusVisible: { outline: 'none', boxShadow: 'none' },
  }) satisfies SystemStyleObject;

export const clearButtonStyle = {
  position: 'absolute',
  top: '50%',
  right: '12px',
  transform: 'translateY(-50%)',
  display: 'flex',
  p: '4px',
  color: colors.textMuted,
  cursor: 'pointer',
  _hover: { color: colors.text },
} satisfies SystemStyleObject;
