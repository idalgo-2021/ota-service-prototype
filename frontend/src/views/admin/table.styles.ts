import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

// Общий вид таблиц админки: фильтры над таблицей, таблица в карточке, пагинация под ней.

export const rootStyle = {
  gap: '16px',
} satisfies SystemStyleObject;

export const filtersStyle = {
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  gap: '12px',
} satisfies SystemStyleObject;

export const dateRangeStyle = {
  w: '420px',
  maxW: '100%',
} satisfies SystemStyleObject;

export const resetStyle = {
  h: '40px',
  px: '12px',
  bg: colors.primarySoft,
  color: colors.primary,
  fontSize: '14px',
  fontWeight: '500',
  borderRadius: '8px',
  cursor: 'pointer',
  _hover: { bg: colors.hoverBg },
} satisfies SystemStyleObject;

export const cardStyle = {
  p: '0',
  overflowX: 'auto',
  border: '1px solid #e5e5ea',
  borderRadius: '14px',
  bg: colors.white,
  boxShadow: '0 1px 2px rgba(0,0,0,0.035)',
} satisfies SystemStyleObject;

export const tableStyle = {
  w: '100%',
  fontSize: '13px',
  color: colors.text,
  '& tbody tr': { transition: 'background-color 160ms ease-out' },
  '& tbody tr:hover': { backgroundColor: '#fafaff' },
} satisfies SystemStyleObject;

export const headerCellStyle = {
  px: '14px',
  py: '12px',
  bg: '#f9f9fb',
  color: colors.textMuted,
  fontSize: '11px',
  fontWeight: '600',
  whiteSpace: 'normal',
  borderBottom: `1px solid ${colors.borderLight}`,
} satisfies SystemStyleObject;

export const cellStyle = {
  px: '14px',
  py: '12px',
  verticalAlign: 'middle',
  overflowWrap: 'anywhere',
  borderBottom: `1px solid ${colors.borderLight}`,
} satisfies SystemStyleObject;

export const getTableBodyStyle = (refreshing: boolean) =>
  ({
    opacity: refreshing ? 0.5 : 1,
    transition: 'opacity 0.16s',
  }) satisfies SystemStyleObject;

export const primaryTextStyle = {
  fontWeight: '500',
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
} satisfies SystemStyleObject;

export const recordLinkStyle = {
  color: colors.primary,
  fontWeight: '600',
  _hover: { textDecoration: 'underline' },
} satisfies SystemStyleObject;

export const secondaryTextStyle = {
  fontSize: '12px',
  color: colors.textMuted,
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
} satisfies SystemStyleObject;

export const actionsStyle = {
  gap: '6px',
  flexWrap: 'wrap',
  alignItems: 'center',
} satisfies SystemStyleObject;

export const skeletonStyle = {
  h: '16px',
  borderRadius: '6px',
} satisfies SystemStyleObject;

export const messageStyle = {
  p: '24px',
  textAlign: 'center',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const errorStyle = {
  px: '12px',
  py: '8px',
  bg: '#FDECEB',
  color: colors.danger,
  borderRadius: '12px',
  fontSize: '14px',
} satisfies SystemStyleObject;
