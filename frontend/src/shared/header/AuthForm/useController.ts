import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { useState, type SubmitEvent } from 'react';
import { useLoginMutation, useRegisterMutation } from '@/lib/api';
import { signedIn } from '@/lib/auth';
import { useAppDispatch } from '@/lib/hooks';

export type AuthMode = 'login' | 'register';

const getErrorMessage = (error: unknown, mode: AuthMode) => {
  const status = (error as FetchBaseQueryError | undefined)?.status;
  if (status === 401) {
    return 'Неверная почта или пароль';
  }
  if (status === 409) {
    return 'Эта почта уже зарегистрирована — войдите';
  }
  if (status === 400) {
    return 'Проверьте почту и пароль';
  }
  return mode === 'login'
    ? 'Не удалось войти, попробуйте еще раз'
    : 'Не удалось зарегистрироваться, попробуйте еще раз';
};

export const useController = (onSuccess?: () => void) => {
  const dispatch = useAppDispatch();
  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [register, { isLoading: isRegistering }] = useRegisterMutation();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = isLoggingIn || isRegistering;

  const handleModeChange = (next: AuthMode) => () => {
    setMode(next);
    setError(null);
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    setError(null);
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    setError(null);
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleCredentialSelect = (nextEmail: string, nextPassword: string) => {
    setMode('login');
    setEmail(nextEmail);
    setPassword(nextPassword);
    setError(null);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const credentials = { email: email.trim(), password };
    try {
      // У бэкенда регистрация не выдаёт токены, поэтому сразу после неё входим.
      if (mode === 'register') {
        await register(credentials).unwrap();
      }
      const tokens = await login(credentials).unwrap();
      dispatch(signedIn({ ...tokens, email: credentials.email }));
      onSuccess?.();
    } catch (err) {
      setError(getErrorMessage(err, mode));
    }
  };

  return {
    mode,
    email,
    password,
    showPassword,
    error,
    isSubmitting,
    handleModeChange,
    handleEmailChange,
    handlePasswordChange,
    handleTogglePassword,
    handleCredentialSelect,
    handleSubmit,
  };
};
