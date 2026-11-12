import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../colors';

export const rootStyle = {
  display: 'flex',
  gap: '8px',
  alignContent: 'center',
} satisfies SystemStyleObject;

export const controlStyle = {
  display: 'inline-flex',
  position: 'relative',
  w: '36px',
  h: '20px',
  p: '0',
  borderRadius: '10px',
  bg: colors.borderMedium,
  cursor: 'pointer',
  transition: 'background-color 0.16s',
  _checked: { bg: colors.success },
} satisfies SystemStyleObject;

export const thumbStyle = {
  position: 'absolute',
  top: '1px',
  left: '2px',
  w: '17px',
  h: '17px',
  borderRadius: '50%',
  bg: colors.white,
  translate: '0px',
  transition: 'transform 0.16s',
  _checked: { transform: 'translateX(15px)' },
} satisfies SystemStyleObject;

export const labelStyle = {
  fontSize: '16px',
  lineHeight: '20px',
  fontWeight: 'normal',
  color: colors.text,
  cursor: 'pointer',
} satisfies SystemStyleObject;
