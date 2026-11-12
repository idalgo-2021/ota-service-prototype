import Link from 'next/link';
import { Stack, Text } from '@chakra-ui/react';
import { formatDateTime } from '../../format';
import type { ResourceConfig } from '../types';
import { createdColumn, str, TwoLines } from './cells';
import { UserProfileDetails } from './UserProfileDetails';
import { translateAdmin } from '../../adminLocale';

const GENDERS = [
  { value: 'female', label: 'Женский' },
  { value: 'male', label: 'Мужской' },
  { value: 'other', label: 'Другой' },
];

const ROLES = [
  { value: 'user', label: 'Клиент' },
  { value: 'manager', label: 'Менеджер' },
  { value: 'admin', label: 'Администратор' },
  { value: 'hotelier', label: 'Отельер' },
];

// Через админку создаются учётные записи сотрудников и отельеров: клиенты регистрируются сами.
const STAFF_ROLES = ROLES.filter((role) => role.value !== 'user');

const genderLabel = (value: unknown) => GENDERS.find((gender) => gender.value === value)?.label;
const roleLabel = (value: unknown) => ROLES.find((role) => role.value === value)?.label;

export const clientsConfig: ResourceConfig = {
  key: 'clients',
  label: 'Клиенты',
  title: 'Профили клиентов',
  path: '/admin/client-profiles',
  getId: (record) => String(record.user_id),
  columns: [
    {
      key: 'client',
      title: 'Клиент',
      render: (record) => {
        const name = [str(record, 'first_name'), str(record, 'last_name')]
          .filter(Boolean)
          .join(' ');
        return (
          <TwoLines
            main={name || str(record, 'email')}
            sub={name ? str(record, 'email') : undefined}
          />
        );
      },
    },
    {
      key: 'about',
      title: 'Пол, год рождения',
      render: (record, lookups) => (
        <TwoLines
          main={translateAdmin(genderLabel(record.gender) ?? '—', lookups.language)}
          sub={
            str(record, 'birth_year') &&
            (lookups.language === 'en'
              ? `Born ${str(record, 'birth_year')}`
              : `${str(record, 'birth_year')} г. р.`)
          }
        />
      ),
    },
    {
      key: 'place',
      title: 'Страна, город',
      render: (record, lookups) => (
        <TwoLines
          main={lookups.label('countries', record.country_id)}
          sub={lookups.label('locations', record.location_id)}
        />
      ),
    },
    {
      key: 'settings',
      title: 'Язык, валюта',
      render: (record) => <TwoLines main={str(record, 'language')} sub={str(record, 'currency')} />,
    },
    createdColumn,
  ],
  fields: [
    { name: 'first_name', label: 'Имя', type: 'text', blank: true },
    { name: 'last_name', label: 'Фамилия', type: 'text', blank: true },
    { name: 'birth_year', label: 'Год рождения', type: 'number', nullable: true },
    { name: 'gender', label: 'Пол', type: 'select', nullable: true, options: GENDERS },
    { name: 'nationality', label: 'Национальность', type: 'text', nullable: true },
    {
      name: 'country_id',
      label: 'Страна',
      type: 'select',
      numeric: true,
      required: true,
      options: (lookups) => lookups.countries,
    },
    {
      name: 'location_id',
      label: 'Город',
      type: 'select',
      numeric: true,
      nullable: true,
      options: (lookups) => lookups.locations,
    },
    {
      name: 'language',
      label: 'Язык',
      type: 'select',
      required: true,
      options: [
        { value: 'RU', label: 'Русский' },
        { value: 'EN', label: 'English' },
      ],
    },
    {
      name: 'currency',
      label: 'Валюта',
      type: 'select',
      required: true,
      options: (lookups) => lookups.currencies,
    },
    { name: 'about', label: 'О себе', type: 'textarea', blank: true, wide: true },
  ],
  canEdit: true,
  recordName: (record) => str(record, 'email') ?? '',
  emptyText: 'Клиентов пока нет.',
};

export const usersConfig: ResourceConfig = {
  key: 'users',
  label: 'Учетные записи',
  title: 'Учетные записи и роли',
  roles: ['admin'],
  path: '/admin/users',
  getId: (record) => String(record.id),
  filters: [{ name: 'role', label: 'Роль', options: ROLES }],
  columns: [
    {
      key: 'user',
      title: 'Имя и фамилия',
      render: (record) => {
        const name = [str(record, 'first_name'), str(record, 'last_name')]
          .filter(Boolean)
          .join(' ');
        const email = str(record, 'email');
        const profileHref = `/admin?tab=users&record=${encodeURIComponent(String(record.id))}`;
        return (
          <Stack align="flex-start" gap="2px">
            {name ? (
              <Link href={profileHref}>
                <Text fontWeight="600" color="blue.700" _hover={{ textDecoration: 'underline' }}>
                  {name}
                </Text>
              </Link>
            ) : email ? (
              <Link href={profileHref}>
                <Text fontWeight="600" color="blue.700" _hover={{ textDecoration: 'underline' }}>
                  {email}
                </Text>
              </Link>
            ) : (
              <Text>—</Text>
            )}
            {name && email && (
              <Link href={profileHref}>
                <Text fontSize="12px" color="blue.700" _hover={{ textDecoration: 'underline' }}>
                  {email}
                </Text>
              </Link>
            )}
          </Stack>
        );
      },
    },
    {
      key: 'role',
      title: 'Роль',
      render: (record, lookups) => (
        <TwoLines
          main={translateAdmin(roleLabel(record.role) ?? '', lookups.language)}
        />
      ),
    },
    {
      key: 'profile',
      title: 'Данные профиля',
      render: (record, lookups) => {
        const place = [
          lookups.label('locations', record.location_id),
          lookups.label('countries', record.country_id),
        ]
          .filter(Boolean)
          .join(', ');
        const personal = [
          translateAdmin(genderLabel(record.gender) ?? '', lookups.language),
          str(record, 'birth_year'),
        ]
          .filter(Boolean)
          .join(' · ');
        const settings = [str(record, 'language'), str(record, 'currency')]
          .filter(Boolean)
          .join(' · ');
        return (
          <TwoLines
            main={
              place || personal || settings ||
              translateAdmin('Профиль заполнен не полностью', lookups.language)
            }
            sub={personal && place ? personal : settings}
          />
        );
      },
    },
    createdColumn,
    {
      key: 'updated_at',
      title: 'Изменен',
      render: (record, lookups) => {
        const value = str(record, 'updated_at');
        return <TwoLines main={value && formatDateTime(value, lookups.language)} />;
      },
    },
  ],
  fields: [
    { name: 'email', label: 'Почта', type: 'email', required: true, mode: 'create' },
    {
      name: 'password',
      label: 'Пароль',
      type: 'password',
      required: true,
      mode: 'create',
      hint: 'От 8 до 72 символов; потом его не увидеть',
    },
    {
      name: 'role',
      label: 'Роль',
      type: 'select',
      required: true,
      mode: 'create',
      options: STAFF_ROLES,
      initial: 'manager',
    },
    {
      name: 'role',
      label: 'Роль',
      type: 'select',
      required: true,
      mode: 'edit',
      options: ROLES,
      hint: 'Новая роль начнет действовать, когда у сотрудника обновится токен',
    },
  ],
  canCreate: true,
  canEdit: true,
  editActionLabel: 'Изменить роль',
  details: {
    label: 'Профиль',
    render: (record) => <UserProfileDetails record={record} />,
  },
  createLabel: 'Добавить сотрудника',
  recordName: (record) => {
    const name = [str(record, 'first_name'), str(record, 'last_name')].filter(Boolean).join(' ');
    return name ? `${name} · ${str(record, 'email') ?? ''}` : (str(record, 'email') ?? '');
  },
  emptyText: 'Учетных записей по этим условиям нет.',
};
