import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  gap: '24px',
} satisfies SystemStyleObject;

export const sectionStyle = {
  gap: '10px',
} satisfies SystemStyleObject;

export const sectionTitleStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: colors.text,
} satisfies SystemStyleObject;

export const skeletonStyle = {
  h: '105px',
  borderRadius: '12px',
} satisfies SystemStyleObject;
