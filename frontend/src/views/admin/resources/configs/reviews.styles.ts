import type { SystemStyleObject } from '@chakra-ui/react';

/** Длинный текст отзыва обрезаем до трёх строк, целиком он виден в подсказке. */
export const reviewTextStyle = {
  maxW: '260px',
  lineClamp: 3,
  whiteSpace: 'normal',
} satisfies SystemStyleObject;
