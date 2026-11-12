import { redirect } from 'next/navigation';

/** Маршрут `/orders`: заказы теперь во вкладке профиля, поэтому перенаправляем туда. */
const Page = () => {
  redirect('/profile?tab=orders');
};

export default Page;
