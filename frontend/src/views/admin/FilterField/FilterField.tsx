'use client';

import { Stack, Text } from '@chakra-ui/react';
import { captionStyle, rootStyle } from './FilterField.styles';

type FilterFieldProps = {
  label: string;
  children: React.ReactNode;
};

/**
 * Поле панели фильтров: мелкая серая подпись и под ней сам элемент ввода.
 * Подпись видимая, а не `<label>`: внутри выбора дат есть кнопки, и клик по `<label>` нажимал бы
 * первую из них, поэтому доступное имя элементу ввода задаёт тот, кто его рисует.
 */
export const FilterField = ({ label, children }: FilterFieldProps) => (
  <Stack {...rootStyle}>
    <Text {...captionStyle}>{label}</Text>
    {children}
  </Stack>
);
