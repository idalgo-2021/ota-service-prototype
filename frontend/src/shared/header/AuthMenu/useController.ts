import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { isHotelier, isStaff, signedOut } from '@/lib/auth';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';

export const useController = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const email = useAppSelector((state) => state.auth.email);
  const isSignedIn = useAppSelector((state) => !!state.auth.accessToken);
  const staff = useAppSelector((state) => isStaff(state.auth.accessToken));
  const hotelier = useAppSelector((state) => isHotelier(state.auth.accessToken));

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSignOut = () => {
    dispatch(signedOut());
    // Ответы могли зависеть от роли пользователя — забываем их вместе с сессией.
    dispatch(api.util.resetApiState());
    setOpen(false);
    router.replace('/');
  };

  return {
    rootRef,
    open,
    email,
    isSignedIn,
    staff,
    hotelier,
    handleToggle,
    handleClose,
    handleSignOut,
  };
};
