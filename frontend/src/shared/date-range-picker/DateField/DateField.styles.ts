import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../../colors';

export const getFieldContainerStyle = (divided?: boolean) =>
  ({
    position: 'relative',
    flex: '1',
    minW: '0',
    borderLeft: divided ? `1px solid ${colors.borderLight}` : undefined,
  }) satisfies SystemStyleObject;

const triggerBaseStyle = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  outline: 'none',
} satisfies SystemStyleObject;

export const labeledTriggerStyle = {
  ...triggerBaseStyle,
  h: '52px',
  pt: '20px',
  pb: '0',
  pl: '16px',
} satisfies SystemStyleObject;

export const plainTriggerStyle = {
  ...triggerBaseStyle,
  h: '40px',
  pl: '12px',
  bg: colors.white,
  border: `1px solid ${colors.borderMedium}`,
  borderRadius: '12px',
  transition: 'box-shadow 0.16s, border-color 0.16s',
  _focusVisible: { boxShadow: `0 0 0 2px ${colors.primaryFocusRing}` },
} satisfies SystemStyleObject;

export const getValueTextStyle = (fontSize: '14px' | '16px', hasValue: boolean) =>
  ({
    fontSize,
    fontWeight: '500',
    lineHeight: '20px',
    color: hasValue ? colors.text : colors.textMuted,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }) satisfies SystemStyleObject;

export const plainIndicatorGroupStyle = {
  position: 'absolute',
  insetEnd: '8px',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
} satisfies SystemStyleObject;

export const plainCalendarIconStyle = {
  color: colors.textMuted,
  display: 'flex',
} satisfies SystemStyleObject;

export const popoverPanelStyle = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: '0',
  zIndex: 20,
  bg: colors.white,
  borderRadius: '16px',
  boxShadow: 'lg',
  p: '12px',
} satisfies SystemStyleObject;

export const getLabeledTriggerStyle = () => ({
  ...labeledTriggerStyle,
  pr: '16px',
});
export const getPlainTriggerStyle = () => ({
  ...plainTriggerStyle,
  pr: '36px',
});
