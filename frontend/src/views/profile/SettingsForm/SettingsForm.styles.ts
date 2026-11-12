import type { SystemStyleObject } from '@chakra-ui/react';

export const countersStyle = {
  gap: '12px',
} satisfies SystemStyleObject;

export const preferencesStyle = {
  gap: '12px',
} satisfies SystemStyleObject;

export const preferenceGridStyle = {
  display: 'grid',
  gridTemplateColumns: {
    base: '1fr',
    md: 'repeat(2, minmax(0, 1fr))',
    xl: 'repeat(3, minmax(0, 1fr))',
  },
  gap: '12px',
  alignItems: 'start',
} satisfies SystemStyleObject;
