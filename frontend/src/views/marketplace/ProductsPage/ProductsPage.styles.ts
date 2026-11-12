import type { SystemStyleObject } from '@chakra-ui/react';
import { inputStyle } from '@/shared/input';

// Поля поиска одной высоты и скругления с кнопкой «Найти», чтобы строка формы была ровной.
const searchFieldStyle = {
  ...inputStyle,
  h: '56px',
  borderRadius: '16px',
} satisfies SystemStyleObject;

export const queryInputStyle = {
  ...searchFieldStyle,
  px: '16px',
} satisfies SystemStyleObject;

export const locationSelectStyle = {
  ...searchFieldStyle,
  ps: '16px',
  pe: '40px',
  cursor: 'pointer',
} satisfies SystemStyleObject;
