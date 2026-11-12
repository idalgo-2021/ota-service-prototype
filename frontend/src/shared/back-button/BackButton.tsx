'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/shared/button';

type BackButtonProps = {
  label?: string;
  fallback?: string;
};

/** Возвращает на фактически предыдущую страницу; при прямом входе ведёт на главную. */
export const BackButton = ({ label = '← Назад', fallback = '/' }: BackButtonProps) => {
  const router = useRouter();

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <Button type="button" appearance="soft" alignSelf="flex-start" onClick={handleClick}>
      {label}
    </Button>
  );
};
