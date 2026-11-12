'use client';

import { RadioGroup as ChakraRadioGroup } from '@chakra-ui/react';

export type RadioButtonGroupProps = ChakraRadioGroup.RootProps;

/**
 * Контейнер группы радиокнопок: хранит выбранное значение, внутрь кладутся сами радиокнопки.
 */
export const RadioButtonGroup = ChakraRadioGroup.Root;
