'use client';

import { Box, chakra } from '@chakra-ui/react';
import type { Guests } from '@/lib/api';
import { Button } from '@/shared/button';
import { DateRangePicker } from '@/shared/date-range-picker';
import { GuestsPicker } from '@/shared/guests-picker';
import { LabeledInput } from '@/shared/input';
import {
  dateRangePickerStyle,
  destinationBoxStyle,
  dialogDateRangePickerStyle,
  dialogDestinationBoxStyle,
  dialogFieldsStyle,
  dialogFormStyle,
  dialogGuestsPickerStyle,
  dialogSubmitButtonStyle,
  formStyle,
  guestsPickerStyle,
  cityCountryStyle,
  cityOptionStyle,
  cityOptionsStyle,
  emptyCityStyle,
  submitButtonStyle,
  sidebarDateRangePickerStyle,
  sidebarFieldsStyle,
  sidebarFormStyle,
  sidebarGuestsPickerStyle,
} from './SearchForm.styles';
import { useController, type SearchFormInitialValues } from './useController';

/**
 * Форма поиска жилья на главной: поле «Направление», выбор дат «Заезд — Выезд»,
 * состав гостей и кнопка «Найти».
 */
type SearchFormProps = {
  initialValues?: SearchFormInitialValues;
  layout?: 'default' | 'dialog' | 'sidebar';
  onSubmitted?: () => void;
  onGuestsChange?: (guests: Guests) => void;
};

export const SearchForm = ({
  initialValues,
  layout = 'default',
  onSubmitted,
  onGuestsChange,
}: SearchFormProps) => {
  const {
    lang,
    destinationId,
    cityListId,
    datesId,
    guestsId,
    query,
    dates,
    guests,
    ready,
    destinationPlaceholder,
    cityOptions,
    cityListMessage,
    showCityList,
    activeCityIndex,
    activeCityId,
    setDates,
    setGuests,
    handleQueryChange,
    handleClearQuery,
    handleCitySelect,
    handleCityKeyDown,
    handleCityFocus,
    handleCityBlur,
    handleSubmit,
  } = useController(initialValues, onSubmitted, onGuestsChange);
  const inDialog = layout === 'dialog';
  const inSidebar = layout === 'sidebar';

  const dateField = (
    <DateRangePicker
      id={datesId}
      {...(inSidebar
        ? sidebarDateRangePickerStyle
        : inDialog
          ? dialogDateRangePickerStyle
          : dateRangePickerStyle)}
      forBooking
      fromLabel={lang === 'en' ? 'Check-in' : 'Заезд'}
      toLabel={lang === 'en' ? 'Check-out' : 'Выезд'}
      fromPlaceholder={lang === 'en' ? 'Select date' : 'Выбрать дату'}
      toPlaceholder={lang === 'en' ? 'Select date' : 'Выбрать дату'}
      locale={lang === 'en' ? 'en-US' : 'ru-RU'}
      value={dates}
      onValueChange={setDates}
    />
  );
  const guestsField = (
    <GuestsPicker
      id={guestsId}
      {...(inSidebar
        ? sidebarGuestsPickerStyle
        : inDialog
          ? dialogGuestsPickerStyle
        : guestsPickerStyle)}
      lang={lang}
      value={guests}
      onValueChange={setGuests}
    />
  );

  return (
    <chakra.form
      {...(inSidebar ? sidebarFormStyle : inDialog ? dialogFormStyle : formStyle)}
      onSubmit={handleSubmit}
    >
      <Box
        {...destinationBoxStyle}
        {...(inDialog || inSidebar ? dialogDestinationBoxStyle : undefined)}
      >
        <LabeledInput
          id={destinationId}
          data-testid="destination-input"
          label={lang === 'en' ? 'Destination' : 'Направление'}
          clearLabel={lang === 'en' ? 'Clear field' : 'Очистить поле'}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showCityList}
          aria-controls={showCityList ? cityListId : undefined}
          aria-activedescendant={activeCityId ? `${cityListId}-${activeCityId}` : undefined}
          autoComplete="off"
          placeholder={destinationPlaceholder}
          value={query}
          onChange={handleQueryChange}
          onFocus={handleCityFocus}
          onBlur={handleCityBlur}
          onKeyDown={handleCityKeyDown}
          onClear={handleClearQuery}
        />
        {showCityList && (
          <chakra.ul id={cityListId} role="listbox" {...cityOptionsStyle}>
            {cityOptions.length ? (
              cityOptions.map((city, index) => (
                <chakra.li
                  key={city.id}
                  id={`${cityListId}-${city.id}`}
                  role="option"
                  aria-selected={index === activeCityIndex}
                  {...cityOptionStyle}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleCitySelect(city)}
                >
                  <chakra.span>{city.name}</chakra.span>
                  {city.country && <chakra.span {...cityCountryStyle}>{city.country}</chakra.span>}
                </chakra.li>
              ))
            ) : (
              <chakra.li role="presentation" {...emptyCityStyle}>
                {cityListMessage}
              </chakra.li>
            )}
          </chakra.ul>
        )}
      </Box>
      {inDialog ? (
        <Box {...dialogFieldsStyle}>
          {dateField}
          {guestsField}
        </Box>
      ) : inSidebar ? (
        <Box {...sidebarFieldsStyle}>
          {dateField}
          {guestsField}
        </Box>
      ) : (
        <>
          {dateField}
          {guestsField}
        </>
      )}
      <Button
        type="submit"
        disabled={!ready}
        {...(inDialog || inSidebar ? dialogSubmitButtonStyle : submitButtonStyle)}
      >
        {lang === 'en' ? 'Search' : 'Найти'}
      </Button>
    </chakra.form>
  );
};
