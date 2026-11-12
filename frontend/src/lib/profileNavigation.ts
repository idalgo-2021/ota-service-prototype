export type ProfileTab = 'personal' | 'settings' | 'bookings' | 'orders' | 'reviews';

type ProfileHrefOptions = {
  tab?: ProfileTab;
  created?: string;
  services?: 'confirmed' | 'failed';
  returnTo?: string;
};

const PROFILE_PATH = '/profile';

/**
 * Разрешаем возврат только на локальную страницу сайта и не разрешаем профиль,
 * иначе крестик может зациклить пользователя на том же окне.
 */
export const getSafeProfileReturnTo = (value: string | string[] | null | undefined) => {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate?.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return undefined;
  }

  try {
    const url = new URL(candidate, 'http://local');
    if (
      url.origin !== 'http://local' ||
      url.pathname === PROFILE_PATH ||
      url.pathname.startsWith(`${PROFILE_PATH}/`)
    ) {
      return undefined;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
};

/** Адрес текущей страницы, к которому профиль должен вернуться после закрытия. */
export const getCurrentProfileReturnTo = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  if (window.location.pathname === PROFILE_PATH) {
    return getSafeProfileReturnTo(new URLSearchParams(window.location.search).get('return_to'));
  }
  return getSafeProfileReturnTo(
    `${window.location.pathname}${window.location.search}${window.location.hash}`
  );
};

export const buildProfileHref = ({ tab, created, services, returnTo }: ProfileHrefOptions = {}) => {
  const params = new URLSearchParams();
  if (tab && tab !== 'personal') {
    params.set('tab', tab);
  }
  if (created) {
    params.set('created', created);
  }
  if (services) {
    params.set('services', services);
  }
  const safeReturnTo = getSafeProfileReturnTo(returnTo);
  if (safeReturnTo) {
    params.set('return_to', safeReturnTo);
  }
  const query = params.toString();
  return query ? `${PROFILE_PATH}?${query}` : PROFILE_PATH;
};
