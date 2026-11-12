'use client';

import { Box, chakra, Text } from '@chakra-ui/react';
import Link from 'next/link';
import type { CatalogLanguage } from '@/lib/api';
import { Button } from '../../button';
import { UserIcon } from '../../icons';
import { AuthForm } from '../AuthForm';
import {
  accountCaptionStyle,
  accountEmailStyle,
  menuLinkStyle,
  panelStyle,
  rootStyle,
  signOutStyle,
  triggerStyle,
  triggerTextStyle,
} from './AuthMenu.styles';
import { useController } from './useController';

/**
 * Кнопка входа в правой части шапки. Гостю по клику открывает панель с формой входа
 * и регистрации, вошедшему — панель с его почтой, ссылкой в рабочий кабинет и кнопкой выхода.
 * Клик снаружи или Escape панель закрывают.
 */
export const AuthMenu = ({ lang }: { lang: CatalogLanguage }) => {
  const {
    rootRef,
    open,
    email,
    isSignedIn,
    staff,
    hotelier,
    handleToggle,
    handleClose,
    handleSignOut,
  } = useController();
  const en = lang === 'en';

  return (
    <Box ref={rootRef} {...rootStyle}>
      <chakra.button
        type="button"
        aria-label={isSignedIn ? (en ? 'Account menu' : 'Меню аккаунта') : en ? 'Sign in' : 'Войти'}
        aria-expanded={open}
        aria-haspopup="dialog"
        {...triggerStyle}
        onClick={handleToggle}
      >
        <UserIcon size={24} />
        <Text as="span" {...triggerTextStyle}>
          {isSignedIn ? (email ?? (en ? 'Profile' : 'Профиль')) : en ? 'Sign in' : 'Войти'}
        </Text>
      </chakra.button>

      {open && (
        <Box
          role="dialog"
          aria-label={isSignedIn ? (en ? 'Profile' : 'Профиль') : en ? 'Sign in' : 'Вход'}
          {...panelStyle}
        >
          {isSignedIn ? (
            <>
              <Text {...accountCaptionStyle}>{en ? 'Signed in as' : 'Вы вошли как'}</Text>
              <Text {...accountEmailStyle}>{email}</Text>
              {staff && (
                <Button asChild {...menuLinkStyle}>
                  <Link href="/admin" onClick={handleClose}>
                    {en ? 'Admin' : 'Админка'}
                  </Link>
                </Button>
              )}
              {hotelier && (
                <Button asChild {...menuLinkStyle}>
                  <Link href="/hotelier" onClick={handleClose}>
                    {en ? 'Hotelier account' : 'Кабинет отельера'}
                  </Link>
                </Button>
              )}
              <Button appearance="soft" {...signOutStyle} onClick={handleSignOut}>
                {en ? 'Sign out' : 'Выйти'}
              </Button>
            </>
          ) : (
            <AuthForm onSuccess={handleClose} />
          )}
        </Box>
      )}
    </Box>
  );
};
