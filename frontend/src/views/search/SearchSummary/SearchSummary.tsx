'use client';

import { chakra, Dialog, Flex, Portal, Stack, Text } from '@chakra-ui/react';
import { useState } from 'react';
import type { Stay } from '@/lib/stay';
import { IconButton } from '@/shared/icon-button';
import { CloseIcon } from '@/shared/icons';
import { SearchForm } from '@/views/main/SearchForm';
import {
  closeButtonStyle,
  datesStyle,
  destinationStyle,
  dialogContentStyle,
  dialogHeaderStyle,
  dialogPositionerStyle,
  dialogTitleStyle,
  stackStyle,
  triggerStyle,
} from './SearchSummary.styles';
import { useController } from './useController';

type SearchSummaryProps = {
  destination: string;
  locationIds: number[];
  stay: Stay;
};

/**
 * Карточка-сводка запроса вверху боковой колонки: направление, даты заезда–выезда
 * или «Любое направление» / «Любые даты», если они не заданы, и состав гостей.
 */
export const SearchSummary = ({ destination, locationIds, stay }: SearchSummaryProps) => {
  const { dates, guests } = useController(stay);
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={(details) => setOpen(details.open)} placement="center">
      <Dialog.Trigger asChild>
        <chakra.button type="button" aria-label="Изменить параметры поиска" {...triggerStyle}>
          <Stack {...stackStyle}>
            <Text {...destinationStyle}>{destination || 'Любое направление'}</Text>
            <Text {...datesStyle}>{dates || 'Любые даты'}</Text>
            <Text {...datesStyle}>{guests}</Text>
          </Stack>
        </chakra.button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner {...dialogPositionerStyle}>
          <Dialog.Content {...dialogContentStyle}>
            <Flex {...dialogHeaderStyle}>
              <Dialog.Title {...dialogTitleStyle}>Изменить параметры поиска</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <IconButton label="Закрыть" {...closeButtonStyle}>
                  <CloseIcon size={20} />
                </IconButton>
              </Dialog.CloseTrigger>
            </Flex>
            {open && (
              <SearchForm
                layout="dialog"
                initialValues={{ destination, locationIds, stay, guestsExplicit: true }}
                onSubmitted={() => setOpen(false)}
              />
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
