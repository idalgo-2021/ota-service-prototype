'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ComponentProps, MouseEvent } from 'react';
import {
  buildProfileHref,
  getCurrentProfileReturnTo,
  type ProfileTab,
} from '@/lib/profileNavigation';

type ProfileLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  tab?: ProfileTab;
  created?: string;
  services?: 'confirmed' | 'failed';
};

/**
 * Ссылка в профиль запоминает страницу вместе с её параметрами. Благодаря этому после
 * обновления профиля крестик всё равно вернёт туда, откуда пользователь его открыл.
 */
export const ProfileLink = ({
  tab,
  created,
  services,
  onClick,
  replace,
  scroll,
  ...props
}: ProfileLinkProps) => {
  const router = useRouter();
  const href = buildProfileHref({ tab, created, services });

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (event.currentTarget.target && event.currentTarget.target !== '_self')
    ) {
      return;
    }

    event.preventDefault();
    const destination = buildProfileHref({
      tab,
      created,
      services,
      returnTo: getCurrentProfileReturnTo(),
    });
    const options = { scroll: scroll ?? true };
    if (replace) {
      router.replace(destination, options);
    } else {
      router.push(destination, options);
    }
  };

  return <Link {...props} href={href} replace={replace} scroll={scroll} onClick={handleClick} />;
};
