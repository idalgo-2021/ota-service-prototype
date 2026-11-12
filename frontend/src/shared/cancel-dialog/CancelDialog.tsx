'use client';

import { chakra, Dialog, Flex, Portal, Text, Textarea } from '@chakra-ui/react';
import type { CatalogLanguage } from '@/lib/api';
import { Button } from '../button';
import {
  backButtonStyle,
  bodyStyle,
  captionStyle,
  confirmButtonStyle,
  contentStyle,
  errorStyle,
  footerStyle,
  textareaStyle,
  titleStyle,
} from './CancelDialog.styles';
import { useController } from './useController';

type CancelDialogProps = {
  lang?: CatalogLanguage;
  /** Что отменяем, например «бронь 3f2a1c9e» */
  subject: string;
  /** Без причины бэкенд отмену не примет */
  reasonRequired: boolean;
  pending: boolean;
  error?: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  /** Свой заголовок вместо «Отменить …?», например для отклонения отзыва */
  title?: string;
  /** Своя подпись кнопки подтверждения вместо «Отменить» */
  confirmLabel?: string;
};

/**
 * Окно подтверждения отмены (или другого действия с причиной, например отклонения) с полем для причины. Причина уходит клиенту и в историю записи,
 * поэтому, если она обязательна, кнопка отмены неактивна, пока поле пустое.
 */
export const CancelDialog = ({
  lang = 'ru',
  subject,
  reasonRequired,
  pending,
  error,
  onConfirm,
  onClose,
  title,
  confirmLabel,
}: CancelDialogProps) => {
  const { reason, canConfirm, handleReasonChange, handleOpenChange, handleSubmit } = useController(
    reasonRequired,
    pending,
    onConfirm,
    onClose
  );

  return (
    <Dialog.Root open onOpenChange={handleOpenChange} placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content {...contentStyle}>
            <chakra.form onSubmit={handleSubmit}>
              <Dialog.Title {...titleStyle}>
                {title ?? (lang === 'en' ? `Cancel ${subject}?` : `Отменить ${subject}?`)}
              </Dialog.Title>
              <Dialog.Body {...bodyStyle}>
                <chakra.label {...captionStyle}>
                  {lang === 'en'
                    ? reasonRequired
                      ? 'Reason'
                      : 'Reason (optional)'
                    : reasonRequired
                      ? 'Причина'
                      : 'Причина (необязательно)'}
                  <Textarea
                    value={reason}
                    rows={3}
                    autoFocus
                    {...textareaStyle}
                    onChange={handleReasonChange}
                  />
                </chakra.label>
                {error && <Text {...errorStyle}>{error}</Text>}
              </Dialog.Body>
              <Flex {...footerStyle}>
                <Button type="button" appearance="soft" {...backButtonStyle} onClick={onClose}>
                  {lang === 'en'
                    ? title
                      ? 'Back'
                      : 'Keep booking'
                    : title
                      ? 'Назад'
                      : 'Не отменять'}
                </Button>
                <Button
                  type="submit"
                  disabled={!canConfirm}
                  loading={pending}
                  {...confirmButtonStyle}
                >
                  {confirmLabel ?? (lang === 'en' ? 'Cancel' : 'Отменить')}
                </Button>
              </Flex>
            </chakra.form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
