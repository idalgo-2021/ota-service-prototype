import type { SystemStyleObject } from '@chakra-ui/react';
import { inputStyle } from '@/shared/input';

export const fieldStyle = {
  ...inputStyle,
  pe: '32px',
  cursor: 'pointer',
} satisfies SystemStyleObject;
