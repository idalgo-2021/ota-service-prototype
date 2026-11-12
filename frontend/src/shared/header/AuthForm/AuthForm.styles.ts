import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../../colors';

export const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
} satisfies SystemStyleObject;

export const titleStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '6px',
  mb: '4px',
  fontSize: '18px',
  fontWeight: '500',
  lineHeight: '24px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const getModeButtonStyle = (active: boolean) =>
  ({
    p: '0',
    color: active ? colors.text : colors.primary,
    cursor: active ? 'default' : 'pointer',
    _hover: active ? undefined : { color: colors.primaryHover },
  }) satisfies SystemStyleObject;

/** Рамка вокруг поля: на белом фоне панели поле без неё не видно. Кольцо фокуса рисует само поле. */
export const fieldStyle = {
  position: 'relative',
  border: `1px solid ${colors.borderMedium}`,
  borderRadius: '16px',
} satisfies SystemStyleObject;

export const demoCredentialsStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  p: '10px 12px',
  borderRadius: '12px',
  bg: colors.primarySoft,
} satisfies SystemStyleObject;

export const demoTitleStyle = {
  fontSize: '12px',
  fontWeight: '700',
  lineHeight: '16px',
  color: colors.text,
} satisfies SystemStyleObject;

export const demoRowStyle = {
  display: 'grid',
  gridTemplateColumns: '52px minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: '8px',
  minWidth: 0,
  w: '100%',
  p: 0,
  border: 0,
  bg: 'transparent',
  textAlign: 'left',
  cursor: 'pointer',
  _hover: { bg: 'rgba(63, 81, 181, 0.08)' },
  _focusVisible: { outline: `2px solid ${colors.primary}`, outlineOffset: '2px' },
} satisfies SystemStyleObject;

export const demoRoleStyle = {
  fontSize: '11px',
  lineHeight: '16px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const demoValueStyle = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  p: 0,
  textAlign: 'left',
  fontSize: '12px',
  lineHeight: '16px',
  color: colors.primary,
  cursor: 'pointer',
  _groupHover: { color: colors.primaryHover },
} satisfies SystemStyleObject;

export const demoCopiedStyle = {
  mt: '2px',
  fontSize: '11px',
  lineHeight: '14px',
  color: colors.success,
} satisfies SystemStyleObject;

/** Поле внутри рамки: вровень с ней по высоте, справа место под кнопку-глаз. */
export const fieldInputStyle = {
  h: '50px',
  fontSize: '16px',
} satisfies SystemStyleObject;

export const passwordInputStyle = {
  ...fieldInputStyle,
  pr: '44px',
} satisfies SystemStyleObject;

export const eyeButtonStyle = {
  position: 'absolute',
  top: '50%',
  right: '12px',
  transform: 'translateY(-50%)',
  display: 'flex',
  p: '4px',
  color: colors.primary,
  cursor: 'pointer',
  _hover: { color: colors.primaryHover },
} satisfies SystemStyleObject;

export const errorStyle = {
  fontSize: '14px',
  lineHeight: '18px',
  color: colors.danger,
} satisfies SystemStyleObject;

export const submitStyle = {
  w: '100%',
  h: '48px',
  mt: '4px',
  borderRadius: '12px',
} satisfies SystemStyleObject;
