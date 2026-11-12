'use client';

import {
  Box,
  chakra,
  Dialog,
  Flex,
  NativeSelect,
  Portal,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import type { ReactNode } from 'react';
import type { AdminRecord } from '@/lib/adminApi';
import { Button } from '@/shared/button';
import { Checkbox } from '@/shared/checkbox';
import { Input } from '@/shared/input';
import type { FieldConfig, FormValue, Lookups } from '../types';
import {
  buttonStyle,
  checkboxRowStyle,
  getContentStyle,
  errorStyle,
  editContentStyle,
  fieldErrorStyle,
  footerStyle,
  getFieldStyle,
  gridStyle,
  hintStyle,
  jsonStyle,
  labelStyle,
  selectFieldStyle,
  textareaStyle,
  titleStyle,
} from './RecordDialog.styles';
import { useController, type RecordDialogTarget } from './useController';
import { translateAdmin, useAdminLanguage } from '../../adminLocale';

const INPUT_TYPES: Partial<Record<FieldConfig['type'], string>> = {
  number: 'number',
  time: 'time',
  datetime: 'datetime-local',
  email: 'email',
  password: 'password',
  url: 'url',
};

type RecordDialogProps = {
  title: string;
  fields: FieldConfig[];
  target: RecordDialogTarget;
  lookups: Lookups;
  createPath: string;
  getRecordPath: (record: AdminRecord) => string;
  editContent?: ReactNode;
  onClose: () => void;
};

/**
 * Окно создания или изменения записи: поля по описанию раздела в две колонки,
 * подсказки и ошибки под полями, ошибка бэкенда над кнопками. При изменении сохраняются
 * только поменянные поля; кнопка «Сохранить» активна, когда что-то поменяли.
 */
export const RecordDialog = ({
  title,
  fields: allFields,
  target,
  lookups,
  createPath,
  getRecordPath,
  editContent,
  onClose,
}: RecordDialogProps) => {
  const lang = useAdminLanguage();
  const t = (text: string) => translateAdmin(text, lang);
  const {
    fields,
    values,
    errors,
    dirty,
    saving,
    saveError,
    handleChange,
    handleToggle,
    handleOptionToggle,
    handleOpenChange,
    handleSubmit,
  } = useController(allFields, target, createPath, getRecordPath, onClose);

  const renderControl = (field: FieldConfig, id: string, value: FormValue) => {
    const invalid = Boolean(errors[field.name]);
    switch (field.type) {
      case 'checkbox':
        return (
          <Box {...checkboxRowStyle}>
            <Checkbox checked={Boolean(value)} onCheckedChange={handleToggle(field.name)}>
              {field.label}
            </Checkbox>
          </Box>
        );
      case 'multiselect': {
        const options =
          typeof field.options === 'function' ? field.options(lookups) : (field.options ?? []);
        const selected = new Set(
          String(value ?? '')
            .split(',')
            .filter(Boolean)
        );
        return (
          <Stack
            maxH="260px"
            overflowY="auto"
            gap="8px"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="8px"
            p="10px"
          >
            {options.map((option) => (
              <Checkbox
                key={option.value}
                checked={selected.has(option.value)}
                onCheckedChange={handleOptionToggle(field.name, option.value)}
              >
                {t(option.label)}
              </Checkbox>
            ))}
          </Stack>
        );
      }
      case 'select': {
        const options =
          typeof field.options === 'function' ? field.options(lookups) : (field.options ?? []);
        return (
          <NativeSelect.Root>
            <NativeSelect.Field
              id={id}
              value={String(value)}
              aria-invalid={invalid}
              {...selectFieldStyle}
              onChange={handleChange(field.name)}
            >
              {(!field.required || !value) && <option value="">{t('Не выбрано')}</option>}
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        );
      }
      case 'textarea':
      case 'json':
        return (
          <Textarea
            id={id}
            value={String(value)}
            placeholder={field.placeholder}
            aria-invalid={invalid}
            spellCheck={field.type === 'textarea'}
            {...(field.type === 'json' ? jsonStyle : textareaStyle)}
            onChange={handleChange(field.name)}
          />
        );
      default:
        return (
          <Input
            id={id}
            type={INPUT_TYPES[field.type] ?? 'text'}
            inputMode={field.type === 'decimal' ? 'decimal' : undefined}
            step={field.type === 'number' ? 'any' : undefined}
            autoComplete={field.type === 'password' ? 'new-password' : 'off'}
            value={String(value)}
            placeholder={field.placeholder}
            aria-invalid={invalid}
            onChange={handleChange(field.name)}
          />
        );
    }
  };

  return (
    <Dialog.Root open onOpenChange={handleOpenChange} placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content {...getContentStyle(Boolean(editContent))}>
            <chakra.form onSubmit={handleSubmit} noValidate>
              <Dialog.Title {...titleStyle}>{title}</Dialog.Title>
              <Dialog.Body {...gridStyle}>
                {fields.map((field) => {
                  const id = `admin-field-${field.name}`;
                  const wide =
                    Boolean(field.wide) || field.type === 'json' || field.type === 'multiselect';
                  return (
                    <Box key={field.name} {...getFieldStyle(wide)}>
                      {field.type !== 'checkbox' && (
                        <chakra.label htmlFor={id} {...labelStyle}>
                          {field.label}
                          {field.required ? ' *' : ''}
                        </chakra.label>
                      )}
                      {renderControl(field, id, values[field.name])}
                      {errors[field.name] ? (
                        <Text role="alert" {...fieldErrorStyle}>
                          {errors[field.name]}
                        </Text>
                      ) : (
                        field.hint && <Text {...hintStyle}>{field.hint}</Text>
                      )}
                    </Box>
                  );
                })}
              </Dialog.Body>
              {editContent && <Box {...editContentStyle}>{editContent}</Box>}
              {saveError && (
                <Text role="alert" {...errorStyle}>
                  {saveError}
                </Text>
              )}
              <Flex {...footerStyle}>
                <Button type="button" appearance="soft" {...buttonStyle} onClick={onClose}>
                  {t('Отмена')}
                </Button>
                <Button type="submit" {...buttonStyle} loading={saving} disabled={!dirty}>
                  {t(target.mode === 'create' ? 'Создать' : 'Сохранить')}
                </Button>
              </Flex>
            </chakra.form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
