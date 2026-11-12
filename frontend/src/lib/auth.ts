import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

export type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  /** Почта, с которой вошли: в токене её нет, поэтому запоминаем из формы. */
  email: string | null;
  /**
   * Сессию уже подняли из хранилища. До этого пустые токены не значат «гость»:
   * страницы только для вошедших ждут этого флага, чтобы не мигать заглушкой.
   */
  restored: boolean;
};

export type Role = 'user' | 'manager' | 'admin' | 'hotelier';

const STORAGE_KEY = 'auth';

/**
 * Достаёт роль из полезной нагрузки access-токена. Подпись не проверяем: роль нужна только
 * чтобы решить, что показать, — права всё равно проверяет бэкенд.
 */
export const getRole = (accessToken: string | null): Role | null => {
  if (!accessToken) {
    return null;
  }
  try {
    const payload = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).role ?? null;
  } catch {
    return null;
  }
};

/** Stable user identifier for client-side state scoped to the signed-in account. */
export const getUserId = (accessToken: string | null): string | null => {
  if (!accessToken) {
    return null;
  }
  try {
    const payload = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const userId = JSON.parse(atob(payload)).user_id;
    return typeof userId === 'string' && userId ? userId : null;
  } catch {
    return null;
  }
};

/** Сотрудник (менеджер или админ) — ему доступна админка. */
export const isStaff = (accessToken: string | null) => {
  const role = getRole(accessToken);
  return role === 'manager' || role === 'admin';
};

export const isHotelier = (accessToken: string | null) => getRole(accessToken) === 'hotelier';

const emptyState: AuthState = {
  accessToken: null,
  refreshToken: null,
  email: null,
  restored: false,
};

/** Читает сохранённую сессию. На сервере и при недоступном хранилище возвращает пустую. */
export const loadAuthState = (): AuthState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptyState, ...JSON.parse(raw) } : emptyState;
  } catch {
    return emptyState;
  }
};

export const saveAuthState = ({ accessToken, refreshToken, email }: AuthState) => {
  try {
    if (accessToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, refreshToken, email }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Хранилище недоступно (приватный режим и т.п.) — сессия просто не переживёт перезагрузку.
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: emptyState,
  reducers: {
    restored: (_state, action: PayloadAction<AuthState>) => ({ ...action.payload, restored: true }),
    signedIn: (state, action: PayloadAction<AuthTokens & { email: string }>) => {
      state.accessToken = action.payload.access_token;
      state.refreshToken = action.payload.refresh_token;
      state.email = action.payload.email;
    },
    tokensRefreshed: (state, action: PayloadAction<AuthTokens>) => {
      state.accessToken = action.payload.access_token;
      state.refreshToken = action.payload.refresh_token;
    },
    signedOut: () => ({ ...emptyState, restored: true }),
  },
});

export const { restored, signedIn, tokensRefreshed, signedOut } = authSlice.actions;
export const authReducer = authSlice.reducer;
