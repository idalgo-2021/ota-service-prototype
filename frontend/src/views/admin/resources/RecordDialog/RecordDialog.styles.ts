import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';
import { inputStyle } from '@/shared/input';

export const getContentStyle = (hasEditContent: boolean) =>
  ({
    w: { base: 'calc(100vw - 32px)', md: hasEditContent ? '900px' : '720px' },
    maxW: 'calc(100vw - 32px)',
    maxH: 'calc(100dvh - 32px)',
    p: '20px',
    bg: colors.white,
    borderRadius: '16px',
    boxShadow: '0 8px 40px rgba(45, 49, 55, 0.3)',
    overflowY: 'auto',
    overflowX: 'hidden',
    boxSizing: 'border-box',
  }) satisfies SystemStyleObject;

export const editContentStyle = {
  mt: '18px',
  pt: '16px',
  borderTop: '1px solid #E7E9EC',
  minW: '0',
  w: '100%',
  maxW: '100%',
  boxSizing: 'border-box',
} satisfies SystemStyleObject;

export const titleStyle = {
  mb: '16px',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '24px',
  color: colors.text,
} satisfies SystemStyleObject;

export const gridStyle = {
  display: 'grid',
  gridTemplateColumns: { base: '1fr', md: '1fr 1fr' },
  gap: '14px 16px',
  p: '0',
} satisfies SystemStyleObject;

export const getFieldStyle = (wide: boolean) =>
  ({
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    gridColumn: wide ? { md: '1 / -1' } : undefined,
    minW: '0',
  }) satisfies SystemStyleObject;

export const labelStyle = {
  fontSize: '12px',
  lineHeight: '16px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const hintStyle = {
  fontSize: '12px',
  lineHeight: '16px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const fieldErrorStyle = {
  fontSize: '12px',
  lineHeight: '16px',
  color: colors.danger,
} satisfies SystemStyleObject;

export const selectFieldStyle = {
  ...inputStyle,
  pe: '32px',
  cursor: 'pointer',
} satisfies SystemStyleObject;

export const textareaStyle = {
  ...inputStyle,
  h: 'auto',
  minH: '88px',
  py: '8px',
  resize: 'vertical',
} satisfies SystemStyleObject;

export const jsonStyle = {
  ...textareaStyle,
  minH: '120px',
  fontFamily: 'mono',
  fontSize: '13px',
} satisfies SystemStyleObject;

export const checkboxRowStyle = {
  alignSelf: 'flex-start',
  mt: { md: '22px' },
} satisfies SystemStyleObject;

export const errorStyle = {
  mt: '16px',
  px: '12px',
  py: '8px',
  bg: '#FDECEB',
  color: colors.danger,
  borderRadius: '12px',
  fontSize: '14px',
} satisfies SystemStyleObject;

export const footerStyle = {
  justifyContent: 'flex-end',
  gap: '8px',
  mt: '20px',
} satisfies SystemStyleObject;

export const buttonStyle = {
  h: '40px',
  borderRadius: '12px',
} satisfies SystemStyleObject;
