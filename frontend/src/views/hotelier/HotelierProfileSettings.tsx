'use client';

import { useState, type SubmitEvent } from 'react';
import { Box, chakra, Flex, NativeSelect, Text } from '@chakra-ui/react';
import {
  useUpdateProfileMutation,
  type CatalogLanguage,
  type ClientProfile,
  type Dictionaries,
} from '@/lib/api';
import { Button } from '@/shared/button';
import { Card } from '@/shared/card';
import { ProfileField } from '../profile/ProfileField';
import { getSaveError } from '../profile/getSaveError';
import {
  actionsStyle,
  errorStyle,
  formStyle,
  gridStyle,
  savedStyle,
  sectionTitleStyle,
  selectFieldStyle,
  submitStyle,
} from '../profile/form.styles';

const COPY = {
  ru: {
    title: 'Язык и валюта',
    language: 'Язык интерфейса',
    currency: 'Валюта',
    save: 'Сохранить',
    reset: 'Отменить изменения',
    saved: 'Сохранено',
    russian: 'Русский',
    english: 'English',
  },
  en: {
    title: 'Language and currency',
    language: 'Interface language',
    currency: 'Currency',
    save: 'Save',
    reset: 'Discard changes',
    saved: 'Saved',
    russian: 'Russian',
    english: 'English',
  },
} as const;

export const HotelierProfileSettings = ({
  profile,
  dictionaries,
  lang,
}: {
  profile: ClientProfile;
  dictionaries?: Dictionaries;
  lang: CatalogLanguage;
}) => {
  const t = COPY[lang];
  const initial = { language: profile.language.toUpperCase(), currency: profile.currency };
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [updateProfile, updateState] = useUpdateProfileMutation();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const dirty = draft.language !== baseline.language || draft.currency !== baseline.currency;

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const updated = await updateProfile({
        language: draft.language,
        currency: draft.currency,
      }).unwrap();
      const next = { language: updated.language.toUpperCase(), currency: updated.currency };
      setBaseline(next);
      setDraft(next);
      setSaved(true);
      setError(undefined);
    } catch (cause) {
      setError(getSaveError(cause, lang));
      setSaved(false);
    }
  };

  const handleReset = () => {
    setDraft(baseline);
    setSaved(false);
    setError(undefined);
  };

  const currencies = dictionaries?.currencies ?? [];
  const hasCurrentCurrency = currencies.some((currency) => currency.code === draft.currency);

  return (
    <Card asChild>
      <chakra.form {...formStyle} onSubmit={handleSubmit}>
        <Text as="h2" {...sectionTitleStyle}>
          {t.title}
        </Text>
        <Box {...gridStyle}>
          <ProfileField label={t.language} htmlFor="hotelier-profile-language">
            <NativeSelect.Root>
              <NativeSelect.Field
                id="hotelier-profile-language"
                value={draft.language}
                {...selectFieldStyle}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, language: event.target.value }));
                  setSaved(false);
                  setError(undefined);
                }}
              >
                <option value="RU">{t.russian}</option>
                <option value="EN">{t.english}</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </ProfileField>
          <ProfileField label={t.currency} htmlFor="hotelier-profile-currency">
            <NativeSelect.Root>
              <NativeSelect.Field
                id="hotelier-profile-currency"
                value={draft.currency}
                {...selectFieldStyle}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, currency: event.target.value }));
                  setSaved(false);
                  setError(undefined);
                }}
              >
                {!hasCurrentCurrency && <option value={draft.currency}>{draft.currency}</option>}
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
        <Flex {...actionsStyle}>
          <Button type="submit" {...submitStyle} loading={updateState.isLoading} disabled={!dirty}>
            {t.save}
          </Button>
          <Button
            type="button"
            appearance="soft"
            {...submitStyle}
            disabled={!dirty || updateState.isLoading}
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
