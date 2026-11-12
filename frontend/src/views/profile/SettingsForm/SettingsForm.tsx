'use client';

import { Box, chakra, Flex, NativeSelect, Stack, Text } from '@chakra-ui/react';
import type { CatalogLanguage, ClientProfile, Dictionaries } from '@/lib/api';
import { MAX_ADULTS, MAX_CHILDREN } from '@/lib/stay';
import { Button } from '@/shared/button';
import { Card } from '@/shared/card';
import { Checkbox } from '@/shared/checkbox';
import { GuestCounter } from '@/shared/guests-picker/GuestCounter';
import {
  actionsStyle,
  errorStyle,
  formStyle,
  gridStyle,
  optionsStyle,
  savedStyle,
  sectionHintStyle,
  sectionTitleStyle,
  selectFieldStyle,
  submitStyle,
} from '../form.styles';
import { ProfileField } from '../ProfileField';
import { countersStyle, preferenceGridStyle, preferencesStyle } from './SettingsForm.styles';
import { useController } from './useController';

const COPY = {
  ru: {
    languageCurrency: 'Язык и валюта',
    language: 'Язык',
    languageHint: 'На этом языке показываются профиль, названия и описания объектов',
    russian: 'Русский',
    english: 'English',
    currency: 'Валюта',
    currencyHint: 'Пока цены на сайте показываются в рублях',
    search: 'Параметры поиска',
    searchHint:
      'Подставляются в поиск жилья и продуктов, если вы не меняли параметры на странице поиска.',
    remember: 'Запоминать параметры поиска',
    destination: 'Город',
    anyDestination: 'Любой город',
    accommodation: 'Тип жилья',
    accommodationHint: 'Ничего не выбрано — показываем любое',
    anyAccommodation: 'Любой тип жилья',
    nights: 'Ночей',
    adults: 'Взрослые',
    children: 'Дети',
    pets: 'С питомцами',
    sort: 'Сортировка',
    housing: 'Жилье',
    products: 'Продукты',
    priceSort: 'По цене',
    ratingSort: 'По рейтингу',
    cheaper: 'Сначала дешевле',
    pricier: 'Сначала дороже',
    save: 'Сохранить',
    reset: 'Отменить изменения',
    saved: 'Сохранено',
  },
  en: {
    languageCurrency: 'Language and currency',
    language: 'Language',
    languageHint: 'Your profile, property names and descriptions use this language',
    russian: 'Russian',
    english: 'English',
    currency: 'Currency',
    currencyHint: 'Prices on the site are currently shown in rubles',
    search: 'Search preferences',
    searchHint:
      'Applied to accommodation and product searches until you change their settings on the search page.',
    remember: 'Remember search preferences',
    destination: 'City',
    anyDestination: 'Any city',
    accommodation: 'Accommodation type',
    accommodationHint: 'Leave empty to include all types',
    anyAccommodation: 'Any type',
    nights: 'Nights',
    adults: 'Adults',
    children: 'Children',
    pets: 'With pets',
    sort: 'Sort by',
    housing: 'Accommodation',
    products: 'Products',
    priceSort: 'By price',
    ratingSort: 'By rating',
    cheaper: 'Lowest price first',
    pricier: 'Highest price first',
    save: 'Save',
    reset: 'Discard changes',
    saved: 'Saved',
  },
} as const;

const MAX_NIGHTS = 365;

type SettingsFormProps = {
  profile: ClientProfile;
  dictionaries?: Dictionaries;
  lang: CatalogLanguage;
};

/**
 * Карточка «Настройки»: язык каталога и валюта, а ниже — параметры поиска, которые
 * подставляются, когда клиент ищет без явных условий: направления, типы жилья, число ночей,
 * гости, питомцы и сортировка. Без флажка «Запоминать параметры поиска» сохранённые
 * параметры удаляются.
 */
export const SettingsForm = ({ profile, dictionaries, lang }: SettingsFormProps) => {
  const t = COPY[lang];
  const {
    draft,
    currencies,
    locations,
    listingTypes,
    dirty,
    saving,
    saved,
    error,
    handleSelectChange,
    handleRememberSearchChange,
    handleLocationChange,
    handleListingTypeChange,
    handlePreferenceChange,
    handleNightsChange,
    handleAdultsChange,
    handleChildrenChange,
    handlePetsChange,
    handleSubmit,
    handleReset,
  } = useController(profile, dictionaries, lang);
  const { preferences } = draft;
  const languageOptions = [
    { value: 'RU', label: t.russian },
    { value: 'EN', label: t.english },
  ];
  const priceOptions = [
    { value: 'asc', label: t.cheaper },
    { value: 'desc', label: t.pricier },
  ];
  const ratingOptions = [
    { value: 'desc', label: lang === 'ru' ? 'Сначала высокий рейтинг' : 'Highest rated first' },
    { value: 'asc', label: lang === 'ru' ? 'Сначала низкий рейтинг' : 'Lowest rated first' },
  ];

  return (
    <Card asChild>
      <chakra.form {...formStyle} onSubmit={handleSubmit} noValidate>
        <Text as="h2" {...sectionTitleStyle}>
          {t.languageCurrency}
        </Text>
        <Box {...gridStyle}>
          <ProfileField label={t.language} htmlFor="settings-language" hint={t.languageHint}>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="settings-language"
                value={draft.language}
                {...selectFieldStyle}
                onChange={handleSelectChange('language')}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </ProfileField>
          <ProfileField label={t.currency} htmlFor="settings-currency" hint={t.currencyHint}>
            <NativeSelect.Root>
              <NativeSelect.Field
                id="settings-currency"
                value={draft.currency}
                {...selectFieldStyle}
                onChange={handleSelectChange('currency')}
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </ProfileField>
        </Box>

        <Text as="h2" {...sectionTitleStyle}>
          {t.search}
        </Text>
        <Text {...sectionHintStyle}>{t.searchHint}</Text>
        <Checkbox checked={draft.rememberSearch} onCheckedChange={handleRememberSearchChange}>
          {t.remember}
        </Checkbox>
        {draft.rememberSearch && (
          <Stack {...preferencesStyle}>
            <Box {...preferenceGridStyle}>
              <ProfileField label={t.destination} htmlFor="settings-destination">
                <NativeSelect.Root>
                  <NativeSelect.Field
                    id="settings-destination"
                    value={preferences.location_ids[0] ? String(preferences.location_ids[0]) : ''}
                    {...selectFieldStyle}
                    onChange={handleLocationChange}
                  >
                    <option value="">{t.anyDestination}</option>
                    {locations.map((location) => (
                      <option key={location.id} value={String(location.id)}>
                        {location.name}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </ProfileField>
              <ProfileField
                label={t.accommodation}
                htmlFor="settings-accommodation"
                hint={t.accommodationHint}
              >
                <NativeSelect.Root>
                  <NativeSelect.Field
                    id="settings-accommodation"
                    value={
                      preferences.listing_type_ids[0]
                        ? String(preferences.listing_type_ids[0])
                        : ''
                    }
                    {...selectFieldStyle}
                    onChange={handleListingTypeChange}
                  >
                    <option value="">{t.anyAccommodation}</option>
                    {listingTypes.map((type) => (
                      <option key={type.id} value={String(type.id)}>
                        {type.name}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </ProfileField>
            </Box>
            <Box {...preferenceGridStyle}>
              <Stack {...countersStyle}>
                <GuestCounter
                  lang={lang}
                  label={t.nights}
                  value={preferences.nights}
                  min={1}
                  max={MAX_NIGHTS}
                  onValueChange={handleNightsChange}
                />
                <GuestCounter
                  lang={lang}
                  label={t.adults}
                  value={preferences.adults_count}
                  min={1}
                  max={MAX_ADULTS}
                  onValueChange={handleAdultsChange}
                />
                <GuestCounter
                  lang={lang}
                  label={t.children}
                  value={preferences.children_count}
                  min={0}
                  max={MAX_CHILDREN}
                  onValueChange={handleChildrenChange}
                />
                <Checkbox checked={preferences.has_pets} onCheckedChange={handlePetsChange}>
                  {t.pets}
                </Checkbox>
              </Stack>
              <ProfileField
                label={`${t.housing}: ${t.priceSort}`}
                htmlFor="settings-housing-price-sort"
              >
                <NativeSelect.Root>
                  <NativeSelect.Field
                    id="settings-housing-price-sort"
                    value={preferences.listing_price_sort}
                    {...selectFieldStyle}
                    onChange={handlePreferenceChange('listing_price_sort')}
                  >
                    {priceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </ProfileField>
              <ProfileField
                label={`${t.housing}: ${t.ratingSort}`}
                htmlFor="settings-housing-rating-sort"
              >
                <NativeSelect.Root>
                  <NativeSelect.Field
                    id="settings-housing-rating-sort"
                    value={preferences.listing_rating_sort}
                    {...selectFieldStyle}
                    onChange={handlePreferenceChange('listing_rating_sort')}
                  >
                    {ratingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </ProfileField>
              <ProfileField
                label={`${t.products}: ${t.priceSort}`}
                htmlFor="settings-products-price-sort"
              >
                <NativeSelect.Root>
                  <NativeSelect.Field
                    id="settings-products-price-sort"
                    value={preferences.product_price_sort}
                    {...selectFieldStyle}
                    onChange={handlePreferenceChange('product_price_sort')}
                  >
                    {priceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </ProfileField>
              <ProfileField
                label={`${t.products}: ${t.ratingSort}`}
                htmlFor="settings-products-rating-sort"
              >
                <NativeSelect.Root>
                  <NativeSelect.Field
                    id="settings-products-rating-sort"
                    value={preferences.product_rating_sort}
                    {...selectFieldStyle}
                    onChange={handlePreferenceChange('product_rating_sort')}
                  >
                    {ratingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </ProfileField>
            </Box>
          </Stack>
        )}

        <Flex {...actionsStyle}>
          <Button type="submit" {...submitStyle} loading={saving} disabled={!dirty}>
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
