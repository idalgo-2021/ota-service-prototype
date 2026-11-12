'use client';

import { Box, chakra, Stack, type StackProps } from '@chakra-ui/react';
import type { CatalogLanguage, Guests } from '@/lib/api';
import { formatGuests, MAX_ADULTS, MAX_CHILDREN } from '@/lib/stay';
import { Checkbox } from '../checkbox';
import { InputLabel } from '../input-label';
import { GuestCounter } from './GuestCounter';
import { panelStyle, rootStyle, triggerStyle, valueStyle } from './GuestsPicker.styles';
import { useController } from './useController';

export type GuestsPickerProps = Omit<StackProps, 'onChange'> & {
  lang?: CatalogLanguage;
  value: Guests;
  onValueChange: (value: Guests) => void;
};

/**
 * Поле «Гости» в белой плашке, как поля дат на главной: подпись сверху и состав гостей.
 * По клику под полем открывается панель со счётчиками взрослых и детей и флажком
 * «с питомцем»; клик снаружи или Escape её закрывают.
 */
export const GuestsPicker = ({ lang = 'ru', value, onValueChange, id, ...props }: GuestsPickerProps) => {
  const {
    rootRef,
    open,
    handleToggleOpen,
    handleTriggerKeyDown,
    handleAdultsChange,
    handleChildrenChange,
    handlePetsChange,
  } = useController(value, onValueChange);

  return (
    <Stack ref={rootRef} {...rootStyle} {...props}>
      <Box
        id={id}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-haspopup="dialog"
        {...triggerStyle}
        onClick={handleToggleOpen}
        onKeyDown={handleTriggerKeyDown}
      >
        <InputLabel label={lang === 'en' ? 'Guests' : 'Гости'} />
        <chakra.span {...valueStyle}>{formatGuests(value, lang)}</chakra.span>
      </Box>
      {open && (
        <Stack role="dialog" aria-label={lang === 'en' ? 'Guests' : 'Гости'} {...panelStyle}>
          <GuestCounter
            lang={lang}
            label={lang === 'en' ? 'Adults' : 'Взрослые'}
            value={value.adults}
            min={1}
            max={MAX_ADULTS}
            onValueChange={handleAdultsChange}
          />
          <GuestCounter
            lang={lang}
            label={lang === 'en' ? 'Children' : 'Дети'}
            hint={lang === 'en' ? 'up to 17 years' : 'до 17 лет'}
            value={value.children}
            min={0}
            max={MAX_CHILDREN}
            onValueChange={handleChildrenChange}
          />
          <Checkbox checked={value.pets} onCheckedChange={handlePetsChange}>
            {lang === 'en' ? 'Travelling with a pet' : 'Еду с питомцем'}
          </Checkbox>
        </Stack>
      )}
    </Stack>
  );
};
