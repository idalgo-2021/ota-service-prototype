import type { ReactNode } from 'react';
import type { AdminQueryParams, AdminRecord } from '@/lib/adminApi';
import type { Role } from '@/lib/auth';
import type { CatalogLanguage } from '@/lib/api';

export type Option = { value: string; label: string };

/** Справочники для выпадающих списков и подписей в таблицах. */
export type Lookups = {
  language: CatalogLanguage;
  countries: Option[];
  locations: Option[];
  listingTypes: Option[];
  currencies: Option[];
  counterparties: Option[];
  listingFeatureTags: Option[];
  /** Подпись записи справочника по id, если она известна. */
  label: (kind: LookupKind, id: unknown) => string | undefined;
};

export type LookupKind = Exclude<keyof Lookups, 'label' | 'language'>;

/**
 * Вид поля формы:
 * `decimal` — деньги и курсы строкой, без потери точности; `json` — объект или массив текстом;
 * `datetime` — дата и время, уходит в RFC 3339; `time` — `HH:MM`.
 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'decimal'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'time'
  | 'datetime'
  | 'json'
  | 'email'
  | 'password'
  | 'url';

/** Значение поля в форме: строка из элемента ввода или флажок. */
export type FormValue = string | boolean;

export type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  /** Пустым оставить нельзя. */
  required?: boolean;
  /** Пустое значение уходит как `null` и очищает поле. */
  nullable?: boolean;
  /** Пустое значение уходит пустой строкой: поле можно очистить, но не `null`. */
  blank?: boolean;
  /** Поле есть только при создании или только при изменении записи. */
  mode?: 'create' | 'edit';
  /** Варианты выпадающего списка; `numeric` — значения отправляются числами. */
  options?: Option[] | ((lookups: Lookups) => Option[]);
  numeric?: boolean;
  /** Значение по умолчанию при создании. */
  initial?: FormValue;
  hint?: string;
  placeholder?: string;
  /** Поле на всю ширину формы. */
  wide?: boolean;
  /** Своё чтение значения из записи и запись в тело запроса, если стандартных мало. */
  read?: (record: AdminRecord) => FormValue;
  write?: (value: FormValue) => unknown;
};

export type FilterConfig = {
  name: string;
  label: string;
  type?: 'text' | 'number';
  options?: Option[] | ((lookups: Lookups) => Option[]);
};

export type ResourceColumn = {
  key: string;
  title: string;
  /** Ширина таблицы; используется для фиксированной, вписывающейся раскладки. */
  width?: string;
  render: (record: AdminRecord, lookups: Lookups) => ReactNode;
};

/** Действие со строкой, отправляемое на бэкенд: «одобрить», «скрыть» и т. п. */
export type ResourceAction = {
  label: string;
  danger?: boolean;
  /** Адрес действия для записи. */
  path: (record: AdminRecord) => string;
  /** Показывать ли кнопку у этой записи. */
  visible?: (record: AdminRecord) => boolean;
  /** Действие требует причину: перед отправкой спрашиваем её в окне. */
  reason?: { title: string; confirmLabel: string };
};

export type ResourceConfig = {
  key: string;
  /** Пункт меню и заголовок раздела. */
  label: string;
  title: string;
  /** Кому доступен раздел; по умолчанию менеджерам и администраторам. */
  roles?: Role[];
  /** Путь списка, начиная с `/admin`. */
  path: string;
  getId: (record: AdminRecord) => string;
  /** Адрес записи для изменения; по умолчанию `path/id`. */
  recordPath?: (record: AdminRecord) => string;
  /** Бэкенд отдаёт список целиком, без страниц. */
  unpaginated?: boolean;
  /** Постоянные параметры списка, например сортировка. */
  params?: AdminQueryParams;
  filters?: FilterConfig[];
  columns: ResourceColumn[];
  /** Распределить колонки по ширине контейнера вместо горизонтальной прокрутки. */
  fitTableToWidth?: boolean;
  /** Фиксированная ширина столбца действий в компактной таблице. */
  actionsColumnWidth?: string;
  /** Optional photo column, controlled by a local display preference. */
  thumbnailColumn?: string;
  fields?: FieldConfig[];
  /** Дополнительное содержимое формы изменения существующей записи. */
  editContent?: (record: AdminRecord) => ReactNode;
  canCreate?: boolean;
  canEdit?: boolean;
  /** Как назвать запись в заголовке окна, например «Москва». */
  recordName: (record: AdminRecord) => string;
  /** Подпись кнопки изменения записи. */
  editActionLabel?: string;
  /** Винительный падеж для кнопки и заголовка: «Добавить город». */
  createLabel?: string;
  actions?: ResourceAction[];
  /** Подробности записи (номера и фото объекта), открываются в отдельном окне. */
  details?: { label: string; render: (record: AdminRecord) => ReactNode; inline?: boolean };
  emptyText: string;
};
