import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import {
  useUpdateProfileMutation,
  type ClientProfile,
  type CatalogLanguage,
  type Dictionaries,
  type Gender,
  type ProfileUpdate,
} from '@/lib/api';
import { getSaveError } from '../getSaveError';

const MIN_BIRTH_YEAR = 1900;

/** Поля формы храним строками, как их отдают элементы ввода; пустая строка — «не указано». */
type Draft = {
  first_name: string;
  last_name: string;
  birth_year: string;
  gender: string;
  nationality: string;
  about: string;
  country_id: string;
  location_id: string;
};

const toDraft = (profile: ClientProfile): Draft => ({
  first_name: profile.first_name,
  last_name: profile.last_name,
  birth_year: profile.birth_year === null ? '' : String(profile.birth_year),
  gender: profile.gender ?? '',
  nationality: profile.nationality ?? '',
  about: profile.about,
  country_id: String(profile.country_id),
  location_id: profile.location_id === null ? '' : String(profile.location_id),
});

const toUpdate = (draft: Draft): ProfileUpdate => ({
  first_name: draft.first_name.trim(),
  last_name: draft.last_name.trim(),
  birth_year: draft.birth_year ? Number(draft.birth_year) : null,
  gender: (draft.gender || null) as Gender | null,
  nationality: draft.nationality.trim() || null,
  about: draft.about.trim(),
  country_id: Number(draft.country_id),
  location_id: draft.location_id ? Number(draft.location_id) : null,
});

const getBirthYearError = (value: string, lang: CatalogLanguage) => {
  if (!value) {
    return undefined;
  }
  const year = Number(value);
  const currentYear = new Date().getFullYear();
  return Number.isInteger(year) && year >= MIN_BIRTH_YEAR && year <= currentYear
    ? undefined
    : lang === 'en'
      ? `Birth year must be between ${MIN_BIRTH_YEAR} and ${currentYear}`
      : `Год рождения — от ${MIN_BIRTH_YEAR} до ${currentYear}`;
};

export const useController = (
  profile: ClientProfile,
  dictionaries: Dictionaries | undefined,
  lang: CatalogLanguage
) => {
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  // Последние сохранённые значения: с ними сравниваем черновик, пока профиль перечитывается.
  const [baseline, setBaseline] = useState(() => toDraft(profile));
  const [draft, setDraft] = useState(baseline);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  const countries = dictionaries?.countries ?? [];
  const locations = (dictionaries?.locations ?? []).filter(
    (location) => String(location.country_id) === draft.country_id
  );
  const birthYearError = getBirthYearError(draft.birth_year, lang);
  const dirty = JSON.stringify(toUpdate(draft)) !== JSON.stringify(toUpdate(baseline));

  const handleChange =
    (field: keyof Draft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      // Город принадлежит стране: при смене страны прежний город сбрасываем.
      setDraft((current) =>
        field === 'country_id'
          ? { ...current, country_id: value, location_id: '' }
          : { ...current, [field]: value }
      );
      setSaved(false);
      setError(undefined);
    };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (birthYearError) {
      return;
    }
    try {
      const next = await updateProfile(toUpdate(draft)).unwrap();
      setBaseline(toDraft(next));
      setDraft(toDraft(next));
      setSaved(true);
    } catch (err) {
      setError(getSaveError(err, lang));
    }
  };

  const handleReset = () => {
    setDraft(baseline);
    setSaved(false);
    setError(undefined);
  };

  return {
    draft,
    countries,
    locations,
    birthYearError,
    dirty,
    saving: isLoading,
    saved,
    error,
    handleChange,
    handleSubmit,
    handleReset,
  };
};
