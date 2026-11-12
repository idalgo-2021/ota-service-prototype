import { useState } from 'react';

type CancelTrigger = (args: { id: string; reason: string }) => PromiseLike<{ error?: unknown }>;

type CancelState = {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  reset: () => void;
};

/**
 * Отмена записи через окно с причиной: какую запись отменяем, открытие и закрытие окна,
 * отправка и текст ошибки. При успехе окно закрывается само, при ошибке остаётся открытым.
 */
export const useCancelFlow = <T extends { id: string }>(
  [cancel, cancelState]: readonly [CancelTrigger, CancelState],
  formatError: (error: unknown) => string
) => {
  const [cancelTarget, setCancelTarget] = useState<T | null>(null);

  const handleCancelOpen = (target: T) => {
    cancelState.reset();
    setCancelTarget(target);
  };

  const handleCancelClose = () => {
    setCancelTarget(null);
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelTarget) {
      return;
    }
    const result = await cancel({ id: cancelTarget.id, reason });
    if (!result.error) {
      setCancelTarget(null);
    }
  };

  return {
    cancelTarget,
    cancelPending: cancelState.isLoading,
    cancelError: cancelState.isError ? formatError(cancelState.error) : undefined,
    handleCancelOpen,
    handleCancelClose,
    handleCancelConfirm,
  };
};
