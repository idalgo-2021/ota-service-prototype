'use client';

import { chakra } from '@chakra-ui/react';
import { ShareIcon } from '../icons';
import { buttonStyle } from './ShareButton.styles';
import { useController } from './useController';

type ShareButtonProps = {
  /** Заголовок для системного меню «Поделиться» */
  title: string;
};

/**
 * Кнопка «Поделиться» ссылкой на текущую страницу: на телефоне открывает системное меню,
 * на компьютере копирует ссылку и на пару секунд пишет «Ссылка скопирована».
 */
export const ShareButton = ({ title }: ShareButtonProps) => {
  const { copied, handleShare } = useController(title);

  return (
    <chakra.button type="button" {...buttonStyle} onClick={handleShare}>
      <ShareIcon size={18} />
      <span aria-live="polite">{copied ? 'Ссылка скопирована' : 'Поделиться'}</span>
    </chakra.button>
  );
};
