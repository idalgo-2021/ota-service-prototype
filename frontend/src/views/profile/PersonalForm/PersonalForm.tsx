'use client';

import { Box, chakra, Flex, NativeSelect, Text, Textarea } from '@chakra-ui/react';
import type { CatalogLanguage, ClientProfile, Dictionaries } from '@/lib/api';
import { Button } from '@/shared/button';
import { Card } from '@/shared/card';
import { Input } from '@/shared/input';
import {
  actionsStyle,
  errorStyle,
  formStyle,
  gridStyle,
  savedStyle,
  sectionTitleStyle,
  selectFieldStyle,
  submitStyle,
  textareaStyle,
  wideStyle,
} from '../form.styles';
import { ProfileField } from '../ProfileField';
import { useController } from './useController';

const COPY = {
  ru: {
    title: 'Личные данные',
    email: 'Электронная почта',
    emailHint: 'Почту изменить нельзя',
    birthYear: 'Год рождения',
    birthYearPlaceholder: 'Например, 1990',
    firstName: 'Имя',
    lastName: 'Фамилия',
    gender: 'Пол',
    nationality: 'Национальность',
    country: 'Страна',
    city: 'Город',
    about: 'О себе',
    unspecified: 'Не указан',
    female: 'Женский',
    male: 'Мужской',
    other: 'Другой',
    save: 'Сохранить',
    reset: 'Отменить изменения',
    saved: 'Сохранено',
  },
  en: {
    title: 'Personal details',
    email: 'Email',
    emailHint: 'Email cannot be changed',
    birthYear: 'Birth year',
    birthYearPlaceholder: 'For example, 1990',
    firstName: 'First name',
    lastName: 'Last name',
    gender: 'Gender',
    nationality: 'Nationality',
    country: 'Country',
    city: 'City',
    about: 'About me',
    unspecified: 'Not specified',
    female: 'Female',
    male: 'Male',
    other: 'Other',
    save: 'Save',
    reset: 'Discard changes',
    saved: 'Saved',
  },
} as const;

type PersonalFormProps = {
  profile: ClientProfile;
  dictionaries?: Dictionaries;
  lang: CatalogLanguage;
};

/**
 * Карточка «Личные данные»: почта (только для чтения), имя, фамилия, год рождения, пол,
 * национальность, страна и город, «о себе». Сохраняет изменения одним запросом;
 * кнопки активны, только когда что-то поменяли.
 */
export const PersonalForm = ({ profile, dictionaries, lang }: PersonalFormProps) => {
  const t = COPY[lang];
  const {
    draft,
    countries,
    locations,
    birthYearError,
    dirty,
    saving,
    saved,
    error,
    handleChange,
    handleSubmit,
    handleReset,
  } = useController(profile, dictionaries, lang);
  const genderOptions = [
    { value: '', label: t.unspecified },
    { value: 'female', label: t.female },
    { value: 'male', label: t.male },
    { value: 'other', label: t.other },
  ];

  return (
    <Card asChild>
      <chakra.form {...formStyle} onSubmit={handleSubmit} noValidate>
        <Text as="h2" {...sectionTitleStyle}>
          {t.title}
        </Text>
        <Box {...gridStyle}>
          <ProfileField label={t.email} htmlFor="profile-email" hint={t.emailHint}>
            <Input id="profile-email" value={profile.email} readOnly disabled />
          </ProfileField>
          <ProfileField label={t.birthYear} htmlFor="profile-birth-year" error={birthYearError}>
            <Input
              id="profile-birth-year"
              inputMode="numeric"
              placeholder={t.birthYearPlaceholder}
              maxLength={4}
              value={draft.birth_year}
              aria-invalid={Boolean(birthYearError)}
              onChange={handleChange('birth_year')}
            />
          </ProfileField>
          <ProfileField label={t.firstName} htmlFor="profile-first-name">
            <Input
              id="profile-first-name"
              autoComplete="given-name"
              maxLength={100}
              value={draft.first_name}
              onChange={handleChange('first_name')}
            />
          </ProfileField>
          <ProfileField label={t.lastName} htmlFor="profile-last-name">
            <Input
              id="profile-last-name"
              autoComplete="family-name"
              maxLength={100}
              value={draft.last_name}
              onChange={handleChange('last_name')}
            />
          </ProfileField>
          <ProfileField label={t.gender} htmlFor="profile-gender">
            <NativeSelect.Root>
              <NativeSelect.Field
                id="profile-gender"
                value={draft.gender}
                {...selectFieldStyle}
                onChange={handleChange('gender')}
              >
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </ProfileField>
          <ProfileField label={t.nationality} htmlFor="profile-nationality">
            <Input
              id="profile-nationality"
              maxLength={100}
              value={draft.nationality}
              onChange={handleChange('nationality')}
            />
          </ProfileField>
          <ProfileField label={t.country} htmlFor="profile-country">
            <NativeSelect.Root>
              <NativeSelect.Field
                id="profile-country"
                value={draft.country_id}
                {...selectFieldStyle}
                onChange={handleChange('country_id')}
              >
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </ProfileField>
          <ProfileField label={t.city} htmlFor="profile-location">
            <NativeSelect.Root>
              <NativeSelect.Field
                id="profile-location"
                value={draft.location_id}
                {...selectFieldStyle}
                onChange={handleChange('location_id')}
              >
                <option value="">{t.unspecified}</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </ProfileField>
          <Box {...wideStyle}>
            <ProfileField label={t.about} htmlFor="profile-about">
              <Textarea
                id="profile-about"
                maxLength={2000}
                value={draft.about}
                {...textareaStyle}
                onChange={handleChange('about')}
              />
            </ProfileField>
          </Box>
        </Box>
        <Flex {...actionsStyle}>
          <Button
            type="submit"
            {...submitStyle}
            loading={saving}
            disabled={!dirty || Boolean(birthYearError)}
          >
            {t.save}
          </Button>
          <Button
            type="button"
            appearance="soft"
            {...submitStyle}
            disabled={!dirty || saving}
            onClick={handleReset}
          >
            {t.reset}
          </Button>
          {saved && (
            <Text role="status" {...savedStyle}>
              {t.saved}
            </Text>
          )}
          {error && (
            <Text role="alert" {...errorStyle}>
              {error}
            </Text>
          )}
        </Flex>
      </chakra.form>
    </Card>
  );
};
