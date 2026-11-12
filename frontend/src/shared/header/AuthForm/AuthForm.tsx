'use client';

import { Box, chakra, Text } from '@chakra-ui/react';
import { Button } from '../../button';
import { IconButton } from '../../icon-button';
import { EyeIcon } from '../../icons';
import { LabeledInput } from '../../input';
import {
  errorStyle,
  eyeButtonStyle,
  fieldInputStyle,
  fieldStyle,
  formStyle,
  getModeButtonStyle,
  passwordInputStyle,
  submitStyle,
  titleStyle,
  demoCredentialsStyle,
  demoTitleStyle,
  demoRowStyle,
  demoRoleStyle,
  demoValueStyle,
  demoCopiedStyle,
} from './AuthForm.styles';
import { useController } from './useController';

type AuthFormProps = {
  onSuccess?: () => void;
};

/**
 * Форма входа по почте и паролю с переключателем «Вход или Регистрация» в заголовке.
 * После регистрации пользователь сразу оказывается залогинен.
 */
export const AuthForm = ({ onSuccess }: AuthFormProps) => {
  const {
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
  } = useController(onSuccess);

  const demoAccounts = [
    { role: 'Пользователь', email: 'alfred@example.com' },
    { role: 'Отельер', email: 'hotelier.one@example.com' },
    { role: 'Админ', email: 'viktor@example.com' },
  ];

  return (
    <chakra.form {...formStyle} onSubmit={handleSubmit} noValidate>
      <Box {...titleStyle}>
        <chakra.button
          type="button"
          aria-pressed={mode === 'login'}
          {...getModeButtonStyle(mode === 'login')}
          onClick={handleModeChange('login')}
        >
          Вход
        </chakra.button>
        или
        <chakra.button
          type="button"
          aria-pressed={mode === 'register'}
          {...getModeButtonStyle(mode === 'register')}
          onClick={handleModeChange('register')}
        >
          Регистрация
        </chakra.button>
      </Box>

      <Box {...demoCredentialsStyle} aria-label="Демо-доступы">
        <Text {...demoTitleStyle}>Демо-доступы</Text>
        {demoAccounts.map(({ role, email }) => (
          <chakra.button
            key={email}
            {...demoRowStyle}
            as="button"
            type="button"
            aria-label={`Войти как ${role}: ${email}`}
            onClick={() => handleCredentialSelect(email, '123')}
          >
            <Text {...demoRoleStyle}>{role}</Text>
            <Text {...demoValueStyle}>{email}</Text>
            <Text {...demoValueStyle}>123</Text>
          </chakra.button>
        ))}
        <Text {...demoCopiedStyle}>Нажмите на строку — данные подставятся в форму</Text>
      </Box>

      <Box {...fieldStyle}>
        <LabeledInput
          id="auth-email"
          label="Электронная почта"
          type="email"
          autoComplete="email"
          placeholder="example@mail.ru"
          autoFocus
          required
          value={email}
          onChange={handleEmailChange}
          {...fieldInputStyle}
        />
      </Box>

      <Box {...fieldStyle}>
        <LabeledInput
          id="auth-password"
          label="Пароль"
          type={showPassword ? 'text' : 'password'}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          value={password}
          onChange={handlePasswordChange}
          {...passwordInputStyle}
        />
        <IconButton
          label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          {...eyeButtonStyle}
          onClick={handleTogglePassword}
        >
          <EyeIcon size={20} closed={!showPassword} />
        </IconButton>
      </Box>

      {error && (
        <Text role="alert" {...errorStyle}>
          {error}
        </Text>
      )}

      <Button
        type="submit"
        {...submitStyle}
        loading={isSubmitting}
        disabled={!email.trim() || !password}
      >
        {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
      </Button>
    </chakra.form>
  );
};
