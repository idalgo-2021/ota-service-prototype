import { useEffect, useState } from 'react';

// Сколько держим подпись «Ссылка скопирована».
const COPIED_MS = 2000;

export const useController = (title: string) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleShare = async () => {
    const url = window.location.href;
    // На телефонах — системное меню «Поделиться», на компьютере — копируем ссылку.
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Гость закрыл меню — ничего не делаем.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Буфер обмена недоступен (нет разрешения) — молча ничего не делаем.
    }
  };

  return { copied, handleShare };
};
