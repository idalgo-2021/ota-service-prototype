'use client';

import { chakra } from '@chakra-ui/react';
import { useId, type ChangeEvent, type KeyboardEvent, type SubmitEvent } from 'react';
import { IconButton } from '@/shared/icon-button';
import { SearchIcon } from '@/shared/icons';
import type { SearchSuggestion } from '../types';
import {
  formStyle,
  inputStyle,
  submitButtonStyle,
  suggestionAddressStyle,
  suggestionKindStyle,
  suggestionNameStyle,
  suggestionStyle,
  suggestionsStyle,
} from './MapSearchForm.styles';

type MapSearchFormSuggestion = SearchSuggestion & {
  /** Подсказка выбрана стрелками: Enter применит её */
  active: boolean;
  handleSelect: () => void;
};

type MapSearchFormProps = {
  query: string;
  /** Идёт запрос к геокодеру — кнопка поиска недоступна */
  searching: boolean;
  suggestions: MapSearchFormSuggestion[];
  onQueryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onSearch: (event: SubmitEvent<HTMLFormElement>) => void;
};

// Нажатие на подсказку не должно уводить фокус из поля, иначе список закроется раньше выбора.
const preventBlur = (event: { preventDefault: () => void }) => {
  event.preventDefault();
};

/**
 * Поле поиска в правом верхнем углу карты: кнопка-лупа и строка ввода
 * «Место, адрес или отель». Во время ввода под полем появляются подсказки: сначала
 * совпадения среди отелей и точек на карте, затем места и адреса из геокодера; районы отмечены отдельной меткой.
 * Подсказку выбирают мышью или стрелками и Enter; без выбора Enter ищет введённый текст.
 */
export const MapSearchForm = ({
  query,
  searching,
  suggestions,
  onQueryChange,
  onKeyDown,
  onBlur,
  onSearch,
}: MapSearchFormProps) => {
  const listboxId = useId();
  const getOptionId = (id: string) => `${listboxId}-${id}`;
  const activeSuggestion = suggestions.find(({ active }) => active);
  const expanded = suggestions.length > 0;

  return (
    <chakra.form {...formStyle} onSubmit={onSearch}>
      <IconButton type="submit" label="Найти на карте" disabled={searching} {...submitButtonStyle}>
        <SearchIcon size={20} />
      </IconButton>
      <chakra.input
        role="combobox"
        aria-label="Поиск места, адреса или отеля"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-activedescendant={activeSuggestion && getOptionId(activeSuggestion.id)}
        autoComplete="off"
        placeholder="Место, адрес или отель"
        value={query}
        {...inputStyle}
        onChange={onQueryChange}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      <chakra.ul id={listboxId} role="listbox" hidden={!expanded} {...suggestionsStyle}>
        {suggestions.map(({ id, name, address, kind, active, handleSelect }) => (
          <chakra.li
            key={id}
            id={getOptionId(id)}
            role="option"
            aria-selected={active}
            {...suggestionStyle}
            onMouseDown={preventBlur}
            onClick={handleSelect}
          >
            <chakra.span {...suggestionNameStyle}>
              {name}
              {kind === 'district' && <chakra.span {...suggestionKindStyle}>район</chakra.span>}
            </chakra.span>
            {address && <chakra.span {...suggestionAddressStyle}>{address}</chakra.span>}
          </chakra.li>
        ))}
      </chakra.ul>
    </chakra.form>
  );
};
