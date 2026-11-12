'use client';

import { Stack, Text, chakra } from '@chakra-ui/react';
import { errorStyle, hintStyle, labelStyle, rootStyle } from './ProfileField.styles';

type ProfileFieldProps = {
  label: string;
  /** id элемента ввода: подпись становится его `<label>`. */
  htmlFor?: string;
  hint?: string;
  /** Ошибка в значении: показывается красным вместо подсказки. */
  error?: string;
  children: React.ReactNode;
};

/**
 * Поле формы профиля: мелкая серая подпись, под ней элемент ввода
 * и необязательная подсказка или ошибка.
 */
export const ProfileField = ({ label, htmlFor, hint, error, children }: ProfileFieldProps) => (
  <Stack {...rootStyle}>
    {htmlFor ? (
      <chakra.label htmlFor={htmlFor} {...labelStyle}>
        {label}
      </chakra.label>
    ) : (
      <Text {...labelStyle}>{label}</Text>
    )}
    {children}
    {error ? (
      <Text role="alert" {...errorStyle}>
        {error}
      </Text>
    ) : (
      hint && <Text {...hintStyle}>{hint}</Text>
    )}
  </Stack>
);
