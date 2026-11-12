import { useState, type ChangeEvent } from 'react';
import { useCreateAdminRecordMutation, useDeleteAdminRecordMutation } from '@/lib/adminApi';
import { getErrorMessage } from '@/lib/api';

export const useController = (addPath: string, nextSortOrder: number) => {
  const [url, setUrl] = useState('');
  const [create, createState] = useCreateAdminRecordMutation();
  const [remove, removeState] = useDeleteAdminRecordMutation();

  const handleUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
    createState.reset();
  };

  const handleAdd = async () => {
    const result = await create({
      path: addPath,
      body: { url: url.trim(), sort_order: nextSortOrder },
    });
    if (!result.error) {
      setUrl('');
    }
  };

  const error = createState.isError
    ? `Не удалось добавить фото: нужна ссылка http(s)${
        getErrorMessage(createState.error) ? ` (${getErrorMessage(createState.error)})` : ''
      }`
    : removeState.isError
      ? 'Не удалось удалить фото.'
      : undefined;

  return {
    url,
    adding: createState.isLoading,
    removingPath: removeState.isLoading ? removeState.originalArgs : undefined,
    error,
    handleUrlChange,
    handleAdd,
    handleRemove: remove,
  };
};
