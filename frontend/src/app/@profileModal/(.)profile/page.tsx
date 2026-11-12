import { ProfileDialogRoute } from '@/app/profile/ProfileDialogRoute';

/** Внутренний переход открывает профиль над текущей страницей. */
const Page = (props: PageProps<'/profile'>) => (
  <ProfileDialogRoute searchParams={props.searchParams} closeWithHistory />
);

export default Page;
