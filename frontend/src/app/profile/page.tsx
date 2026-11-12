import { ProfileDialogRoute } from './ProfileDialogRoute';

/** Прямая ссылка и обновление сохраняют то же окно профиля с доступным закрытием. */
const Page = (props: PageProps<'/profile'>) => (
  <ProfileDialogRoute searchParams={props.searchParams} />
);

export default Page;
