import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../../colors';

export const getRootStyle = (labeled: boolean) => {
  if (!labeled) {
    return { flexDirection: 'row', gap: '8px' } satisfies SystemStyleObject;
  }

  return {
    flexDirection: 'row',
    gap: '0',
    bg: colors.white,
    borderRadius: '16px',
    _focusWithin: { boxShadow: `0 0 0 2px ${colors.primaryFocusRing}` },
  } satisfies SystemStyleObject;
};
