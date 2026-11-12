import type { AdminRecord } from '@/lib/adminApi';
import type { FieldConfig, FormValue } from './types';

const DECIMAL = /^\d+(\.\d+)?$/;

const pad = (value: number) => String(value).padStart(2, '0');

/** Значение для `<input type="datetime-local">` в местном времени. */
const toLocalDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
        date.getHours()
      )}:${pad(date.getMinutes())}`;
};

/** Поля формы для режима: без тех, что есть только при создании или только при изменении. */
export const getFields = (fields: FieldConfig[], mode: 'create' | 'edit') =>
  fields.filter((field) => !field.mode || field.mode === mode);

export const readField = (field: FieldConfig, record?: AdminRecord): FormValue => {
  if (!record) {
    return field.initial ?? (field.type === 'checkbox' ? false : '');
  }
  if (field.read) {
    return field.read(record);
  }
  const value = record[field.name];
  if (field.type === 'checkbox') {
    return Boolean(value);
  }
  if (value === null || value === undefined) {
    return '';
  }
  switch (field.type) {
    case 'json':
      return JSON.stringify(value, null, 2);
    case 'time':
      // Бэкенд отдаёт время с секундами, а принимает `HH:MM`.
      return String(value).slice(0, 5);
    case 'datetime':
      return toLocalDateTime(String(value));
    default:
      return String(value);
  }
};

type Written = { value: unknown } | { error: string } | { skip: true };

const writeField = (field: FieldConfig, raw: FormValue, mode: 'create' | 'edit'): Written => {
  if (field.type === 'checkbox') {
    return { value: Boolean(raw) };
  }
  const text = String(raw).trim();
  // Своё преобразование само решает, чем заменить пустое значение.
  if (!text && !field.write) {
    if (field.required) {
      return { error: 'Заполните поле' };
    }
    // При создании пустое необязательное поле просто не отправляем.
    if (mode === 'create') {
      return { skip: true };
    }
    if (field.nullable) {
      return { value: null };
    }
    return field.blank ? { value: '' } : { error: 'Поле нельзя очистить' };
  }
  if (field.write) {
    try {
      return { value: field.write(text) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Неверное значение' };
    }
  }
  switch (field.type) {
    case 'number': {
      const number = Number(text.replace(',', '.'));
      return Number.isFinite(number) ? { value: number } : { error: 'Введите число' };
    }
    case 'decimal': {
      const decimal = text.replace(',', '.');
      return DECIMAL.test(decimal)
        ? { value: decimal }
        : { error: 'Введите число, например 1500.00' };
    }
    case 'select':
      return { value: field.numeric ? Number(text) : text };
    case 'json':
      try {
        return { value: JSON.parse(text) };
      } catch {
        return { error: 'Неверный JSON' };
      }
    case 'datetime': {
      const date = new Date(text);
      return Number.isNaN(date.getTime())
        ? { error: 'Неверная дата' }
        : { value: date.toISOString() };
    }
    default:
      return { value: text };
  }
};

/**
 * Тело запроса из значений формы. При изменении уходят только поля, которые поменяли:
 * бэкенд меняет лишь переданные поля, а некоторые (код валюты) после создания не принимает.
 */
export const buildBody = (
  fields: FieldConfig[],
  values: Record<string, FormValue>,
  mode: 'create' | 'edit',
  record?: AdminRecord
) => {
  const body: AdminRecord = {};
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field.name];
    if (mode === 'edit' && value === readField(field, record)) {
      continue;
    }
    const written = writeField(field, value, mode);
    if ('error' in written) {
      errors[field.name] = written.error;
    } else if ('value' in written) {
      body[field.name] = written.value;
    }
  }
  return { body, errors };
};
