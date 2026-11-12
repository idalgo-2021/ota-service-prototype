import { chakra, type SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../../colors';

export const containerStyle = {
  w: '272px',
} satisfies SystemStyleObject;

export const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  mb: '8px',
} satisfies SystemStyleObject;

export const monthLabelStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: colors.text,
  textTransform: 'capitalize',
} satisfies SystemStyleObject;

export const anchorInfoStyle = {
  mb: '8px',
  fontSize: '12px',
  color: colors.primary,
} satisfies SystemStyleObject;

export const weekdayGridStyle = {
  gridTemplateColumns: 'repeat(7, 1fr)',
  placeItems: 'center',
  mb: '4px',
} satisfies SystemStyleObject;

export const weekdayLabelStyle = {
  fontSize: '12px',
  color: colors.textMuted,
  textTransform: 'capitalize',
  w: '36px',
  textAlign: 'center',
} satisfies SystemStyleObject;

export const dayGridStyle = {
  gridTemplateColumns: 'repeat(7, 1fr)',
  placeItems: 'center',
} satisfies SystemStyleObject;

export const NavButton = chakra('button', {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    w: '28px',
    h: '28px',
    borderRadius: '8px',
    color: colors.text,
    cursor: 'pointer',
    _hover: { bg: colors.borderLight },
  },
});

export const DayButton = chakra('button', {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    w: '36px',
    h: '36px',
    borderRadius: '10px',
    fontSize: '14px',
    color: colors.text,
    cursor: 'pointer',
    _hover: { bg: colors.borderLight },
    _disabled: { color: colors.textMuted, cursor: 'default', _hover: { bg: 'transparent' } },
  },
});

export type DayButtonState = {
  outsideMonth: boolean;
  isSelected: boolean;
  isAnchor: boolean;
  isToday: boolean;
};

export const getDayButtonStyle = ({
  outsideMonth,
  isSelected,
  isAnchor,
  isToday,
}: DayButtonState) =>
  ({
    color: isSelected
      ? colors.white
      : isAnchor
        ? colors.primary
        : outsideMonth
          ? colors.textMuted
          : undefined,
    bg: isSelected ? colors.primary : isAnchor ? colors.primarySoft : 'transparent',
    border: isAnchor
      ? `2px solid ${colors.primary}`
      : isToday && !isSelected
        ? `1px solid ${colors.primary}`
        : '1px solid transparent',
    _disabled: isAnchor ? { color: colors.primary, opacity: 1 } : undefined,
  }) satisfies SystemStyleObject;
