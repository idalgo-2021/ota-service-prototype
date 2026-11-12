'use client';

import { Flex } from '@chakra-ui/react';
import { Button } from '@/shared/button';
import { actionsStyle } from '../table.styles';
import { translateAdmin, useAdminLanguage } from '../adminLocale';

export type RowAction = {
  label: string;
  /** Опасное действие (например, отмена) выделяется красной заливкой. */
  danger?: boolean;
  onClick: () => void;
};

type RowActionsProps = {
  actions: readonly RowAction[];
  /** Пока по строке выполняется действие, остальные кнопки строки неактивны */
  disabled: boolean;
};

/** Кнопки действий со строкой таблицы; если доступных действий нет, ставит прочерк. */
export const RowActions = ({ actions, disabled }: RowActionsProps) => {
  const lang = useAdminLanguage();
  if (!actions.length) {
    return <>—</>;
  }

  return (
    <Flex {...actionsStyle} w="100%" minW="0">
      {actions.map((action) => (
        <Button
          key={action.label}
          type="button"
          disabled={disabled}
          h="32px"
          minH="32px"
          minW="0"
          px="10px"
          fontSize="12px"
          lineHeight="1.2"
          borderRadius="8px"
          maxW="100%"
          whiteSpace="normal"
          textAlign="center"
          overflowWrap="anywhere"
          {...(action.danger
            ? {
                bg: 'red.600',
                color: 'white',
                _hover: { bg: 'red.700' },
                _active: { bg: 'red.800' },
                _disabled: { opacity: 0.45, cursor: 'default' },
              }
            : {})}
          onClick={action.onClick}
        >
          {translateAdmin(action.label, lang)}
        </Button>
      ))}
    </Flex>
  );
};
