'use client';

import { chakra, type HTMLChakraProps } from '@chakra-ui/react';

export type IconButtonProps = HTMLChakraProps<'button'> & {
  /** Название действия: одновременно `aria-label` для скринридеров и всплывающая подсказка `title`. */
  label: string;
};

/**
 * Кнопка без текстовой подписи — только иконка или глиф внутри (крестик, «+», «⌕»).
 * Название действия передаётся одним пропом `label`, поэтому доступное имя и подсказка
 * всегда совпадают. Внешний вид задаёт вызывающий компонент через style-пропсы.
 */
export const IconButton = ({ label, type = 'button', ...props }: IconButtonProps) => (
  <chakra.button type={type} aria-label={label} title={label} {...props} />
);
