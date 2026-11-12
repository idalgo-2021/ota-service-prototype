import { useState, type ChangeEvent, type SubmitEvent } from 'react';

export const useController = (
  reasonRequired: boolean,
  pending: boolean,
  onConfirm: (reason: string) => void,
  onClose: () => void
) => {
  const [reason, setReason] = useState('');
  const canConfirm = !pending && (!reasonRequired || reason.trim() !== '');

  const handleReasonChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setReason(event.target.value);
  };

  const handleOpenChange = ({ open }: { open: boolean }) => {
    if (!open) {
      onClose();
    }
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canConfirm) {
      onConfirm(reason.trim());
    }
  };

  return { reason, canConfirm, handleReasonChange, handleOpenChange, handleSubmit };
};
