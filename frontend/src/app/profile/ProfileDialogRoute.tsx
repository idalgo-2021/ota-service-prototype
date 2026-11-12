import { getSafeProfileReturnTo } from '@/lib/profileNavigation';
import { ProfileModal } from '@/views/profile/ProfileModal/ProfileModal';
import { ProfileRoute } from './ProfileRoute';

type ProfileDialogRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  closeWithHistory?: boolean;
};

/** Единая оболочка профиля для обычного и перехваченного маршрута. */
export const ProfileDialogRoute = async ({
  searchParams,
  closeWithHistory = false,
}: ProfileDialogRouteProps) => {
  const { return_to: returnTo } = await searchParams;

  return (
    <ProfileModal
      closeHref={getSafeProfileReturnTo(returnTo) ?? '/'}
      closeWithHistory={closeWithHistory}
    >
      <ProfileRoute searchParams={searchParams} />
    </ProfileModal>
  );
};
