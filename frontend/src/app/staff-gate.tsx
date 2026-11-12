'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isHotelier, isStaff } from '@/lib/auth';
import { useAppSelector } from '@/lib/hooks';

/**
 * Сотрудников и отельеров направляем в их рабочие кабинеты, оставляя доступными публичные
 * карточки объектов, продуктов и статей, на которые ведут ссылки из административных списков.
 */
export const StaffGate = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const staff = useAppSelector((state) => isStaff(state.auth.accessToken));
  const hotelier = useAppSelector((state) => isHotelier(state.auth.accessToken));
  const publicRecordPage =
    pathname.startsWith('/listings/') ||
    pathname.startsWith('/products/') ||
    pathname === '/articles' ||
    pathname.startsWith('/articles/');
  const misplaced =
    (staff && !pathname.startsWith('/admin') && !publicRecordPage) ||
    (hotelier && !pathname.startsWith('/hotelier') && !publicRecordPage);

  useEffect(() => {
    if (misplaced) {
      router.replace(staff ? '/admin' : '/hotelier');
    }
  }, [misplaced, router, staff]);

  return misplaced ? null : children;
};
