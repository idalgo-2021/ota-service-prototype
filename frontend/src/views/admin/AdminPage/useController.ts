import type { ComponentType } from 'react';
import { getRole, isStaff, type Role } from '@/lib/auth';
import { useAppSelector } from '@/lib/hooks';
import { HotelierSettings } from '../HotelierSettings';
import { ArticleSettings } from '../ArticleSettings';
import {
  clientsConfig,
  counterpartiesConfig,
  countriesConfig,
  currenciesConfig,
  exchangeRatesConfig,
  listingReviewsConfig,
  listingFeatureTagsConfig,
  listingReviewSummariesConfig,
  listingsConfig,
  listingTypesConfig,
  locationsConfig,
  productReviewsConfig,
  productsConfig,
  usersConfig,
  type ResourceConfig,
} from '../resources';

export type AdminSection = {
  value: string;
  label: string;
  title: string;
  href: string;
  /** Кому доступен раздел; по умолчанию менеджерам и администраторам. */
  roles?: Role[];
  /** Раздел по общему описанию сущности; у броней и заказов свои таблицы. */
  config?: ResourceConfig;
  /** Самостоятельный экран админки для настроек со специальным интерфейсом. */
  component?: ComponentType;
};

export type AdminGroup = { title: string; sections: AdminSection[] };

const fromConfig = (config: ResourceConfig): AdminSection => ({
  value: config.key,
  label: config.label,
  title: config.title,
  href: `/admin?tab=${config.key}`,
  roles: config.roles,
  config,
});

const GROUPS: AdminGroup[] = [
  {
    title: 'Операции',
    sections: [
      { value: 'bookings', label: 'Брони', title: 'Брони проживания', href: '/admin' },
      { value: 'orders', label: 'Заказы', title: 'Заказы услуг', href: '/admin?tab=orders' },
    ],
  },
  {
    title: 'Каталог',
    sections: [listingsConfig, productsConfig, counterpartiesConfig].map(fromConfig),
  },
  {
    title: 'Контент',
    sections: [
      {
        value: 'articles',
        label: 'Статьи',
        title: 'Управление статьями',
        href: '/admin?tab=articles',
        component: ArticleSettings,
      },
    ],
  },
  {
    title: 'Отзывы',
    sections: [listingReviewsConfig, productReviewsConfig, listingReviewSummariesConfig].map(
      fromConfig
    ),
  },
  {
    title: 'Люди',
    sections: [
      ...[clientsConfig, usersConfig].map(fromConfig),
      {
        value: 'hoteliers',
        label: 'Привязки отельеров',
        title: 'Привязки отельеров к объектам',
        href: '/admin?tab=hoteliers',
        roles: ['admin'],
        component: HotelierSettings,
      },
    ],
  },
  {
    title: 'Справочники',
    sections: [
      countriesConfig,
      locationsConfig,
      listingTypesConfig,
      currenciesConfig,
      exchangeRatesConfig,
      listingFeatureTagsConfig,
    ].map(fromConfig),
  },
];

type Access = 'pending' | 'guest' | 'forbidden' | 'granted';

export const useController = (tab: string) => {
  const { accessToken, restored } = useAppSelector((state) => state.auth);
  const role = getRole(accessToken);

  const getAccess = (): Access => {
    if (!restored) {
      return 'pending';
    }
    if (!accessToken) {
      return 'guest';
    }
    return isStaff(accessToken) ? 'granted' : 'forbidden';
  };

  // Менеджеру не показываем разделы, которые бэкенд открывает только администратору.
  const groups = GROUPS.map((group) => ({
    ...group,
    sections: group.sections.filter(
      (section) => !section.roles || (role !== null && section.roles.includes(role))
    ),
  })).filter((group) => group.sections.length);
  const sections = groups.flatMap((group) => group.sections);

  return {
    access: getAccess(),
    groups,
    section: sections.find(({ value }) => value === tab) ?? sections[0],
  };
};
