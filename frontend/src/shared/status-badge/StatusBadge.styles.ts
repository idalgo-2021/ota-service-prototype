import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../colors';

export type StatusTone = 'waiting' | 'active' | 'done' | 'canceled';

const TONES: Record<StatusTone, { bg: string; color: string }> = {
  waiting: { bg: '#FFF4D6', color: '#8A5A00' },
  active: { bg: colors.primarySoft, color: colors.primary },
  done: { bg: '#E6F6DE', color: '#3B7A1E' },
  canceled: { bg: colors.hoverBg, color: colors.textMuted },
};

export const getBadgeStyle = (tone: StatusTone) =>
  ({
    display: 'inline-block',
    px: '8px',
    py: '2px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    lineHeight: '18px',
    whiteSpace: 'nowrap',
    ...TONES[tone],
  }) satisfies SystemStyleObject;
