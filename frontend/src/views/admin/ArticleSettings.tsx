'use client';

import { useState } from 'react';
import {
  Dialog,
  Flex,
  Link as ChakraLink,
  NativeSelect,
  Portal,
  Stack,
  Text,
  Textarea,
  chakra,
} from '@chakra-ui/react';
import Link from 'next/link';
import { Button } from '@/shared/button';
import { Checkbox } from '@/shared/checkbox';
import { Input } from '@/shared/input';
import { Pagination } from '@/shared/pagination';
import { StatusBadge } from '@/shared/status-badge';
import {
  useCreateAdminRecordMutation,
  useGetAdminPageQuery,
  useUpdateAdminRecordMutation,
  type AdminRecord,
} from '@/lib/adminApi';
import { getErrorMessage, useGetDictionariesQuery } from '@/lib/api';
import { useAdminLanguage, translateAdmin } from './adminLocale';
import { AdminTable, type AdminColumn } from './AdminTable';
import { RowActions, type RowAction } from './RowActions';
import { MediaThumbnail } from './resources/configs/MediaThumbnail';
import { FilterInput } from './FilterInput';
import { FilterSelect } from './FilterSelect';
import { getTableStatus } from './options';
import { formatDateTime } from './format';
import {
  createButtonStyle,
  toolbarStyle,
} from './resources/ResourceSection/ResourceSection.styles';
import { errorStyle, primaryTextStyle, recordLinkStyle } from './table.styles';
import {
  buttonStyle as dialogButtonStyle,
  errorStyle as dialogErrorStyle,
  footerStyle as dialogFooterStyle,
  getContentStyle as getDialogContentStyle,
  titleStyle as dialogTitleStyle,
} from './resources/RecordDialog/RecordDialog.styles';

type Article = {
  id: string;
  slug: string;
  title: string;
  content_html: string;
  cover_image_url: string;
  location_id: number | '';
  tags: string[];
  author_name: string;
  is_published: boolean;
  published_at?: string | null;
  created_at: string;
};

type ArticleDraft = Omit<Article, 'id' | 'author_name' | 'published_at' | 'created_at'>;
type TextDraftField = 'slug' | 'title' | 'content_html' | 'cover_image_url';
type StatusFilter = 'all' | 'published' | 'draft';

type ArticleRow = {
  article: Article;
  actions: RowAction[];
  busy: boolean;
};

const PAGE_SIZE = 20;
const emptyDraft = (): ArticleDraft => ({
  slug: '',
  title: '',
  content_html: '',
  cover_image_url: '',
  location_id: '',
  is_published: false,
  tags: [],
});

const toArticle = (record: AdminRecord): Article => ({
  id: String(record.id ?? ''),
  slug: String(record.slug ?? ''),
  title: String(record.title ?? ''),
  content_html: String(record.content_html ?? ''),
  cover_image_url: String(record.cover_image_url ?? ''),
  location_id: Number(record.location_id ?? 0) || '',
  tags: Array.isArray(record.tags)
    ? record.tags.filter((tag): tag is string => typeof tag === 'string')
    : [],
  author_name: String(record.author_name ?? ''),
  is_published: record.is_published === true,
  published_at: typeof record.published_at === 'string' ? record.published_at : null,
  created_at: String(record.created_at ?? ''),
});

export const ArticleSettings = () => {
  const lang = useAdminLanguage();
  const t = (text: string) => translateAdmin(text, lang);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<ArticleDraft>(emptyDraft);
  const [tagsText, setTagsText] = useState('');
  const [saveError, setSaveError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [createArticle, createState] = useCreateAdminRecordMutation();
  const [updateArticle, updateState] = useUpdateAdminRecordMutation();
  const dictionaries = useGetDictionariesQuery('ru');
  const list = useGetAdminPageQuery({
    path: '/admin/articles',
    params: {
      limit: PAGE_SIZE,
      offset,
      search: search.trim() || undefined,
      is_published: status === 'all' ? undefined : status === 'published',
    },
  });
  const articles = (list.data?.items ?? []).map(toArticle);
  const editingArticle = articles.find((article) => article.id === editingId);
  const total = list.data?.meta.total ?? 0;
  const saving = createState.isLoading || updateState.isLoading;

  const startCreate = () => {
    setEditingId(null);
    setEditorOpen(true);
    setStatus('draft');
    setSearch('');
    setOffset(0);
    setDraft(emptyDraft());
    setTagsText('');
    setSaveError(undefined);
  };

  const startEdit = (article: Article) => {
    setEditingId(article.id);
    setEditorOpen(true);
    setDraft({
      slug: article.slug,
      title: article.title,
      content_html: article.content_html,
      cover_image_url: article.cover_image_url,
      location_id: article.location_id,
      is_published: article.is_published,
      tags: article.tags,
    });
    setTagsText(article.tags.join(', '));
    setSaveError(undefined);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditorOpen(false);
    setDraft(emptyDraft());
    setTagsText('');
    setSaveError(undefined);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(undefined);
    if (!draft.location_id) {
      setSaveError(t('Выберите направление'));
      return;
    }
    const { is_published: shouldBePublished, ...articleFields } = draft;
    const body: AdminRecord = {
      ...articleFields,
      location_id: Number(draft.location_id),
      tags: tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    try {
      if (editingId) {
        await updateArticle({
          path: `/admin/articles/${encodeURIComponent(editingId)}`,
          body,
        }).unwrap();
        if (editingArticle && shouldBePublished !== editingArticle.is_published) {
          const action = shouldBePublished ? 'publish' : 'unpublish';
          await updateArticle({
            path: `/admin/articles/${encodeURIComponent(editingId)}/${action}`,
            body: {},
          }).unwrap();
        }
      } else {
        await createArticle({ path: '/admin/articles', body }).unwrap();
      }
      cancelEdit();
    } catch (error) {
      setSaveError(getErrorMessage(error) ?? t('Не удалось сохранить статью.'));
    }
  };

  const togglePublication = async (article: Article) => {
    setActionError(undefined);
    setSaveError(undefined);
    const action = article.is_published ? 'unpublish' : 'publish';
    try {
      await updateArticle({
        path: `/admin/articles/${encodeURIComponent(article.id)}/${action}`,
        body: {},
      }).unwrap();
    } catch (error) {
      const message = getErrorMessage(error) ?? t('Не удалось изменить публикацию.');
      if (editorOpen && editingId === article.id) {
        setSaveError(message);
      } else {
        setActionError(message);
      }
    }
  };

  const updateDraft =
    (field: TextDraftField) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft((current) => ({ ...current, [field]: event.target.value }));
    };

  const locationOptions = (dictionaries.data?.locations ?? []).map((location) => ({
    id: location.id,
    label: location.name_ru || location.name,
  }));
  const locationNames = new Map(locationOptions.map((location) => [location.id, location.label]));

  const rows: ArticleRow[] = articles.map((article) => ({
    article,
    busy: updateState.isLoading,
    actions: [
      { label: 'Изменить', onClick: () => startEdit(article) },
      {
        label: article.is_published ? 'Снять с публикации' : 'Опубликовать',
        onClick: () => void togglePublication(article),
      },
    ],
  }));
  const columns: AdminColumn<ArticleRow>[] = [
    {
      key: 'cover_image_url',
      title: 'Обложка',
      width: '96px',
      render: ({ article }) => (
        <ChakraLink
          asChild
          display="inline-flex"
          aria-label={`${t('Открыть статью')}: ${article.title}`}
        >
          <Link href={`/articles/${encodeURIComponent(article.slug)}`}>
            <MediaThumbnail src={article.cover_image_url} alt={article.title} />
          </Link>
        </ChakraLink>
      ),
    },
    {
      key: 'title',
      title: 'Название статьи',
      width: '260px',
      render: ({ article }) => (
        <Stack gap="3px" align="start">
          <ChakraLink asChild {...recordLinkStyle} textAlign="left">
            <Link href={`/articles/${encodeURIComponent(article.slug)}`}>{article.title}</Link>
          </ChakraLink>
          <Text fontSize="12px" color="fg.muted">
            /articles/{article.slug}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'location_id',
      title: 'Направление',
      render: ({ article }) => (
        <Text {...primaryTextStyle}>{locationNames.get(Number(article.location_id)) || '—'}</Text>
      ),
    },
    {
      key: 'author_name',
      title: 'Автор',
      render: ({ article }) => (
        <Text {...primaryTextStyle}>{article.author_name || t('Автор не указан')}</Text>
      ),
    },
    {
      key: 'created_at',
      title: 'Дата создания',
      render: ({ article }) => <Text>{formatDateTime(article.created_at, lang)}</Text>,
    },
    {
      key: 'published_at',
      title: 'Дата публикации',
      render: ({ article }) => (
        <Text>{article.published_at ? formatDateTime(article.published_at, lang) : '—'}</Text>
      ),
    },
    {
      key: 'is_published',
      title: 'Статус',
      render: ({ article }) => (
        <StatusBadge tone={article.is_published ? 'done' : 'waiting'}>
          {article.is_published ? t('Опубликована') : t('Черновик')}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      title: 'Действия',
      width: '250px',
      render: ({ actions, busy }) => <RowActions actions={actions} disabled={busy} />,
    },
  ];

  return (
    <Stack gap="16px" minW="0">
      <Flex {...toolbarStyle}>
        <FilterInput
          label="Поиск по заголовку"
          value={search}
          onValueChange={(value) => {
            setSearch(value);
            setOffset(0);
          }}
        />
        <FilterSelect
          label="Фильтр публикации"
          value={status}
          options={[
            { value: 'all', label: 'Все статьи' },
            { value: 'published', label: 'Опубликованные' },
            { value: 'draft', label: 'Черновики' },
          ]}
          onValueChange={(value) => {
            setStatus(value);
            setOffset(0);
          }}
        />
        <Button size="sm" {...createButtonStyle} onClick={startCreate}>
          {t('Добавить статью')}
        </Button>
      </Flex>

      {editorOpen ? (
        <Dialog.Root
          open
          onOpenChange={({ open }) => {
            if (!open) {
              cancelEdit();
            }
          }}
          placement="center"
        >
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content {...getDialogContentStyle(false)}>
                <chakra.form onSubmit={handleSave}>
                  <Dialog.Title {...dialogTitleStyle}>
                    {editingId ? t('Изменить статью') : t('Новая статья')}
                  </Dialog.Title>
                  <Dialog.Body p="0">
                    <Stack gap="12px">
                      <Flex gap="12px" flexDirection={{ base: 'column', md: 'row' }}>
                        <Stack flex="1" gap="6px">
                          <Text fontSize="13px" fontWeight="500">
                            {t('Заголовок')}
                          </Text>
                          <Input
                            required
                            maxLength={300}
                            value={draft.title}
                            onChange={updateDraft('title')}
                          />
                        </Stack>
                        <Stack flex="1" gap="6px">
                          <Text fontSize="13px" fontWeight="500">
                            {t('Адрес статьи')}
                          </Text>
                          <Input
                            required
                            maxLength={160}
                            pattern="[a-z0-9]+(-[a-z0-9]+)*"
                            placeholder="petersburg-weekend"
                            value={draft.slug}
                            onChange={updateDraft('slug')}
                          />
                        </Stack>
                      </Flex>
                      <Stack gap="6px">
                        <Text fontSize="13px" fontWeight="500">
                          {t('Направление')}
                        </Text>
                        <NativeSelect.Root>
                          <NativeSelect.Field
                            aria-required="true"
                            value={draft.location_id}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                location_id: event.target.value ? Number(event.target.value) : '',
                              }))
                            }
                          >
                            <option value="">{t('Выберите направление')}</option>
                            {locationOptions.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.label}
                              </option>
                            ))}
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      </Stack>
                      {editingId && (
                        <Checkbox
                          checked={draft.is_published}
                          onCheckedChange={({ checked }) =>
                            setDraft((current) => ({
                              ...current,
                              is_published: checked === true,
                            }))
                          }
                        >
                          {t('Опубликована')}
                        </Checkbox>
                      )}
                      <Stack gap="6px">
                        <Text fontSize="13px" fontWeight="500">
                          {t('URL обложки')}
                        </Text>
                        <Input
                          type="url"
                          placeholder="https://…"
                          value={draft.cover_image_url}
                          onChange={updateDraft('cover_image_url')}
                        />
                      </Stack>
                      <Stack gap="6px">
                        <Text fontSize="13px" fontWeight="500">
                          {t('Теги')}
                        </Text>
                        <Input
                          placeholder={t('Например: Москва, прогулки')}
                          value={tagsText}
                          onChange={(event) => setTagsText(event.target.value)}
                        />
                      </Stack>
                      <Stack gap="6px">
                        <Text fontSize="13px" fontWeight="500">
                          {t('HTML-текст')}
                        </Text>
                        <Textarea
                          minH="220px"
                          fontFamily="mono"
                          fontSize="13px"
                          value={draft.content_html}
                          onChange={updateDraft('content_html')}
                          placeholder={'<p>Текст статьи</p>\n<img src="https://…" alt="Описание">'}
                        />
                        <Text fontSize="12px" color="fg.muted">
                          {t(
                            'Вставляйте изображения в HTML через тег img; сервер очищает опасную разметку.'
                          )}
                        </Text>
                      </Stack>
                    </Stack>
                  </Dialog.Body>
                  {saveError && (
                    <Text role="alert" {...dialogErrorStyle}>
                      {saveError}
                    </Text>
                  )}
                  <Flex {...dialogFooterStyle}>
                    <Button
                      type="button"
                      appearance="soft"
                      {...dialogButtonStyle}
                      onClick={cancelEdit}
                    >
                      {t('Отмена')}
                    </Button>
                    <Button type="submit" {...dialogButtonStyle} disabled={saving} loading={saving}>
                      {editingId ? t('Сохранить') : t('Создать черновик')}
                    </Button>
                  </Flex>
                </chakra.form>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      ) : null}

      {actionError && (
        <Text role="alert" {...errorStyle}>
          {actionError}
        </Text>
      )}
      <AdminTable<ArticleRow>
        tableId="articles"
        pinnedColumn="cover_image_url"
        columns={columns}
        rows={rows}
        getRowKey={({ article }) => article.id}
        status={getTableStatus(list, articles.length)}
        refreshing={list.isFetching && Boolean(list.data)}
        emptyText="Статей по этим условиям нет."
      />
      {total > PAGE_SIZE && (
        <Pagination
          lang={lang}
          total={total}
          limit={PAGE_SIZE}
          offset={offset}
          onOffsetChange={setOffset}
        />
      )}
    </Stack>
  );
};
