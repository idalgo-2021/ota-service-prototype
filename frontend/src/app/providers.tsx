'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { loadAuthState, restored } from '@/lib/auth';
import { store } from '@/lib/store';
import { system } from '@/lib/chakra-system';

/**
 * Клиентские провайдеры приложения: Redux-стор и тема Chakra UI.
 * После монтирования поднимают сохранённую сессию — не раньше, чтобы разметка сервера
 * и первого рендера на клиенте совпадала.
 */
export const Providers = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    store.dispatch(restored(loadAuthState()));
  }, []);

  return (
    <ReduxProvider store={store}>
      <ChakraProvider value={system}>{children}</ChakraProvider>
    </ReduxProvider>
  );
};
