import { hotelCompareReducer } from './hotelCompare';
import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import { authReducer, saveAuthState } from './auth';
import {
  assistantNotificationsPersistence,
  assistantNotificationsReducer,
} from './assistantNotifications';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    assistantNotifications: assistantNotificationsReducer,
    hotelCompare: hotelCompareReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware, assistantNotificationsPersistence),
});

// Сессия переживает перезагрузку страницы: пишем её в localStorage при каждом изменении.
let savedAuth = store.getState().auth;
store.subscribe(() => {
  const { auth } = store.getState();
  if (auth !== savedAuth) {
    savedAuth = auth;
    saveAuthState(auth);
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
