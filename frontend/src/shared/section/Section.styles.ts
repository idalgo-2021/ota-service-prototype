import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  gap: 3,
} satisfies SystemStyleObject;

export const titleStyle = {
  fontWeight: 'semibold',
  color: colors.text,
} satisfies SystemStyleObject;
