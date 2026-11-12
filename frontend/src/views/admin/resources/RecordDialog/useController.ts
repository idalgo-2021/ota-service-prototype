import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import {
  useCreateAdminRecordMutation,
  useUpdateAdminRecordMutation,
  type AdminRecord,
} from '@/lib/adminApi';
import { getErrorMessage } from '@/lib/api';
import { buildBody, getFields, readField } from '../form';
import type { FieldConfig, FormValue } from '../types';

// Бэкенд пишет ошибки по-английски для разработчиков, поэтому сотруднику объясняем по коду ответа,
// а исходный текст добавляем: по нему видно, какое поле не подошло.
const getSaveError = (error: unknown) => {
  const status = (error as FetchBaseQueryError | undefined)?.status;
  const detail = getErrorMessage(error);
  const suffix = detail ? ` (${detail})` : '';
  if (status === 400) {
    return `Бэкенд не принял значения — проверьте поля${suffix}`;
  }
  if (status === 403) {
    return 'Недостаточно прав для этого действия';
  }
  if (status === 409) {
    return `Такая запись уже есть${suffix}`;
  }
  return `Не удалось сохранить${suffix}`;
};

export type RecordDialogTarget = { mode: 'create' } | { mode: 'edit'; record: AdminRecord };

export const useController = (
  allFields: FieldConfig[],
  target: RecordDialogTarget,
  createPath: string,
  getRecordPath: (record: AdminRecord) => string,
  onClose: () => void
) => {
  const record = target.mode === 'edit' ? target.record : undefined;
  const fields = getFields(allFields, target.mode);
  const [values, setValues] = useState<Record<string, FormValue>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, readField(field, record)]))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [create, createState] = useCreateAdminRecordMutation();
  const [update, updateState] = useUpdateAdminRecordMutation();
  const saveState = target.mode === 'create' ? createState : updateState;
  const { body } = buildBody(fields, values, target.mode, record);
  const dirty = target.mode === 'create' || Object.keys(body).length > 0;

  const setValue = (name: string, value: FormValue) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleChange =
    (name: string) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValue(name, event.target.value);
    };

  const handleToggle = (name: string) => () => {
    setValue(name, !values[name]);
  };

  const handleOptionToggle =
    (name: string, option: string) => (details: { checked: boolean | 'indeterminate' }) => {
      const selected = new Set(
        String(values[name] ?? '')
          .split(',')
          .filter(Boolean)
      );
      if (details.checked === true) selected.add(option);
      else selected.delete(option);
      setValue(name, [...selected].join(','));
    };

  const handleOpenChange = ({ open }: { open: boolean }) => {
    if (!open) {
      onClose();
    }
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const built = buildBody(fields, values, target.mode, record);
    if (Object.values(built.errors).some(Boolean)) {
      setErrors(built.errors);
      return;
    }
    const result = record
      ? await update({ path: getRecordPath(record), body: built.body })
      : await create({ path: createPath, body: built.body });
    if (!result.error) {
      onClose();
    }
  };

  return {
    fields,
    values,
    errors,
    dirty,
    saving: saveState.isLoading,
    saveError: saveState.isError ? getSaveError(saveState.error) : undefined,
    handleChange,
    handleToggle,
    handleOptionToggle,
    handleOpenChange,
    handleSubmit,
  };
};
