import { useMemo, useState, type ChangeEvent, type SubmitEvent } from 'react';
import {
  useUpdateProfileMutation,
  type CatalogLanguage,
  type ClientProfile,
  type Dictionaries,
  type SavedSearchPreferences,
} from '@/lib/api';
import { getSaveError } from '../getSaveError';

/** С этого начинаются настройки поиска, если клиент их ещё не сохранял. */
const DEFAULT_PREFERENCES: SavedSearchPreferences = {
  version: 1,
  location_ids: [],
  listing_type_ids: [],
  nights: 1,
  adults_count: 1,
  children_count: 0,
  has_pets: false,
  listing_price_sort: 'asc',
  listing_rating_sort: 'desc',
  product_price_sort: 'asc',
  product_rating_sort: 'desc',
};

type Draft = {
  language: string;
  currency: string;
  /** Запоминать ли параметры поиска: без флажка сохранённые настройки удаляются. */
  rememberSearch: boolean;
  preferences: SavedSearchPreferences;
};

const toDraft = (profile: ClientProfile): Draft => ({
  language: profile.language.toUpperCase(),
  currency: profile.currency,
  rememberSearch: Boolean(profile.search_preferences),
  preferences: profile.search_preferences
    ? {
        ...DEFAULT_PREFERENCES,
        ...profile.search_preferences,
        location_ids: (profile.search_preferences.location_ids ?? []).slice(0, 1),
        listing_type_ids: (profile.search_preferences.listing_type_ids ?? []).slice(0, 1),
      }
    : DEFAULT_PREFERENCES,
});

const toUpdate = ({ language, currency, rememberSearch, preferences }: Draft) => ({
  language,
  currency,
  search_preferences: rememberSearch ? preferences : null,
});

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

  const dirty = JSON.stringify(toUpdate(draft)) !== JSON.stringify(toUpdate(baseline));

  const change = (next: (current: Draft) => Draft) => {
    setDraft(next);
    setSaved(false);
    setError(undefined);
  };

  const changePreferences = (patch: Partial<SavedSearchPreferences>) => {
    change((current) => ({ ...current, preferences: { ...current.preferences, ...patch } }));
  };

  const handleSelectChange =
    (field: 'language' | 'currency') => (event: ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      change((current) => ({ ...current, [field]: value }));
    };

  const handleRememberSearchChange = () => {
    change((current) => ({ ...current, rememberSearch: !current.rememberSearch }));
  };

  const handleLocationChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const id = Number(event.target.value);
    changePreferences({ location_ids: Number.isSafeInteger(id) && id > 0 ? [id] : [] });
  };

  const handleListingTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const id = Number(event.target.value);
    changePreferences({ listing_type_ids: Number.isSafeInteger(id) && id > 0 ? [id] : [] });
  };

  const handlePreferenceChange =
    (
      field:
        'listing_price_sort' | 'listing_rating_sort' | 'product_price_sort' | 'product_rating_sort'
    ) =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      changePreferences({ [field]: event.target.value } as Partial<SavedSearchPreferences>);
    };

  const handleNightsChange = (nights: number) => {
    changePreferences({ nights });
  };

  const handleAdultsChange = (adults_count: number) => {
    changePreferences({ adults_count });
  };

  const handleChildrenChange = (children_count: number) => {
    changePreferences({ children_count });
  };

  const handlePetsChange = () => {
    changePreferences({ has_pets: !draft.preferences.has_pets });
  };

  const locations = useMemo(
    () => [...(dictionaries?.locations ?? [])].sort((a, b) => a.name.localeCompare(b.name, lang)),
    [dictionaries?.locations, lang]
  );

  const listingTypes = dictionaries?.listing_types ?? [];

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    currencies: dictionaries?.currencies ?? [],
    locations,
    listingTypes,
    dirty,
    saving: isLoading,
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
  };
};
