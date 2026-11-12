'use client';

import { Box, chakra } from '@chakra-ui/react';
import type { ChangeEvent, ComponentProps, KeyboardEvent, SubmitEvent } from 'react';
import { MapSearchForm } from '../MapSearchForm';
import { controlIconStyle, controlStyle, rootStyle } from './MapToolbar.styles';

type MapToolbarProps = {
  expanded: boolean;
  compact?: boolean;
  hideExpandControl?: boolean;
  addingPoint: boolean;
  query: string;
  searching: boolean;
  searchSuggestions: ComponentProps<typeof MapSearchForm>['suggestions'];
  onToggleExpanded: () => void;
  onToggleAdding: () => void;
  onQueryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSearchBlur: () => void;
  onSearch: (event: SubmitEvent<HTMLFormElement>) => void;
};

/**
 * Верхняя панель поверх карты: слева кнопки «Развернуть / Свернуть» (полноэкранный режим)
 * и «+ Добавить место» (режим установки точки кликом), справа — поле поиска с подсказками.
 */
export const MapToolbar = ({
  expanded,
  compact = false,
  hideExpandControl = false,
  addingPoint,
  query,
  searching,
  searchSuggestions,
  onToggleExpanded,
  onToggleAdding,
  onQueryChange,
  onSearchKeyDown,
  onSearchBlur,
  onSearch,
}: MapToolbarProps) => (
  <Box {...rootStyle}>
    {!hideExpandControl && (
      <chakra.button
        type="button"
        aria-expanded={expanded}
        aria-label={expanded ? 'Свернуть карту' : 'Развернуть карту'}
        title={expanded ? 'Свернуть карту' : 'Развернуть карту'}
        {...controlStyle}
        onClick={onToggleExpanded}
      >
        <chakra.span aria-hidden {...controlIconStyle}>
          ⛶
        </chakra.span>
        {expanded ? 'Свернуть' : 'Развернуть'}
      </chakra.button>
    )}
    {!compact && (
      <>
        <chakra.button
          type="button"
          aria-pressed={addingPoint}
          aria-label={addingPoint ? 'Отменить добавление места' : 'Добавить место на карту'}
          title={addingPoint ? 'Отменить добавление места' : 'Добавить место на карту'}
          {...controlStyle}
          onClick={onToggleAdding}
        >
          {addingPoint ? 'Отменить' : '+ Добавить место'}
        </chakra.button>
        <MapSearchForm
          query={query}
          searching={searching}
          suggestions={searchSuggestions}
          onQueryChange={onQueryChange}
          onKeyDown={onSearchKeyDown}
          onBlur={onSearchBlur}
          onSearch={onSearch}
        />
      </>
    )}
  </Box>
);
