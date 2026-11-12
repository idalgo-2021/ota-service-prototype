import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { isHotelier, isStaff } from '@/lib/auth';
import { useAppSelector } from '@/lib/hooks';
import styles from './Header.module.css';

export const useController = () => {
  const pathname = usePathname();
  const isMain = pathname === '/';
  // Сотруднику клиентская главная не нужна — логотип ведёт его в админку.
  const homeHref = useAppSelector((state) =>
    isStaff(state.auth.accessToken)
      ? '/admin'
      : isHotelier(state.auth.accessToken)
        ? '/hotelier'
        : '/'
  );

  useEffect(() => {
    document.body.classList.toggle(styles.mainPage, isMain);
    return () => {
      document.body.classList.remove(styles.mainPage);
    };
  }, [isMain]);

  return { isMain, homeHref };
};
