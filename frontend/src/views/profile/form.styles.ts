import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';
import { inputStyle } from '@/shared/input';

/** Общие стили форм профиля: карточка с полями в сетке и строка кнопок под ними. */
export const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
} satisfies SystemStyleObject;

export const sectionTitleStyle = {
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '24px',
  color: colors.text,
} satisfies SystemStyleObject;

export const sectionHintStyle = {
  mt: '-12px',
  fontSize: '14px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const gridStyle = {
  display: 'grid',
  gridTemplateColumns: { base: '1fr', md: '1fr 1fr' },
  gap: '16px',
} satisfies SystemStyleObject;

export const wideStyle = {
  gridColumn: { md: '1 / -1' },
} satisfies SystemStyleObject;

export const selectFieldStyle = {
  ...inputStyle,
  pe: '32px',
  cursor: 'pointer',
} satisfies SystemStyleObject;

export const textareaStyle = {
  ...inputStyle,
  h: 'auto',
  minH: '96px',
  py: '10px',
  resize: 'vertical',
} satisfies SystemStyleObject;

export const optionsStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px 20px',
} satisfies SystemStyleObject;

export const actionsStyle = {
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '12px',
} satisfies SystemStyleObject;

export const submitStyle = {
  h: '44px',
  px: '24px',
  borderRadius: '12px',
} satisfies SystemStyleObject;

export const savedStyle = {
  fontSize: '14px',
  color: '#3B7A1E',
} satisfies SystemStyleObject;

export const errorStyle = {
  fontSize: '14px',
  color: colors.danger,
} satisfies SystemStyleObject;
