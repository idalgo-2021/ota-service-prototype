import type { Metadata } from 'next';
// import Script from 'next/script';
import './globals.css';
import { Header } from '@/shared/header';
import { EmotionRegistry } from './emotion-registry';
import { Providers } from './providers';
import { StaffGate } from './staff-gate';

export const metadata: Metadata = {
  title: 'Frontend',
  description: 'Приложение для Островка',
  icons: { icon: ['/favicon.ico', '/icon.png'] },
};

/**
 * Общий каркас всех страниц: провайдеры, шапка сайта и содержимое маршрута под ней.
 * Сотрудников с клиентских страниц сразу уводит в админку.
 */
const RootLayout = ({ children, profileModal }: LayoutProps<'/'>) => (
  <html lang="en">
    <head>
      {/*{process.env.NODE_ENV === 'development' && (*/}
      {/*  <Script*/}
      {/*    src="https://unpkg.com/react-scan@0.5.7/dist/auto.global.js"*/}
      {/*    crossOrigin="anonymous"*/}
      {/*    strategy="beforeInteractive"*/}
      {/*  />*/}
      {/*)}*/}
    </head>
    <body>
      <EmotionRegistry>
        <Providers>
          <Header />
          <StaffGate>
            {children}
            {profileModal}
          </StaffGate>
        </Providers>
      </EmotionRegistry>
    </body>
  </html>
);

export default RootLayout;
