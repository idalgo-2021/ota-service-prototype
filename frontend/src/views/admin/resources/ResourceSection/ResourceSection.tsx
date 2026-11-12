'use client';

import { chakra, Dialog, Flex, Portal, Stack, Text } from '@chakra-ui/react';
import { Button } from '@/shared/button';
import { CancelDialog } from '@/shared/cancel-dialog';
import { IconButton } from '@/shared/icon-button';
import { CloseIcon } from '@/shared/icons';
import { Pagination } from '@/shared/pagination';
import { AdminTable, type AdminColumn } from '../../AdminTable';
import { PageSizeSelect } from '../../PageSizeSelect';
import { FilterSelect } from '../../FilterSelect';
import { FilterInput } from '../../FilterInput';
import { RowActions } from '../../RowActions';
import { errorStyle, resetStyle, rootStyle } from '../../table.styles';
import { RecordDialog } from '../RecordDialog';
import type { ResourceConfig } from '../types';
import { useLookups } from '../useLookups';
import {
  closeButtonStyle,
  createButtonStyle,
  detailsContentStyle,
  detailsHeaderStyle,
  detailsTitleStyle,
  toolbarStyle,
} from './ResourceSection.styles';
import { useController } from './useController';
import { useRouter } from 'next/navigation';
import { LinkedRecordDialog } from '../LinkedRecordDialog';
import { translateAdmin, translateResourceConfig, useAdminLanguage } from '../../adminLocale';

type Row = ReturnType<typeof useController>['rows'][number];

const getRowKey = (row: Row) => row.id;

type ResourceSectionProps = {
  config: ResourceConfig;
  focusedId?: string;
};

/**
 * Раздел админки по описанию сущности: фильтры и кнопка «Добавить» над таблицей,
 * таблица с действиями в каждой строке, пагинация под ней. Создание и изменение открывают
 * окно с формой, действия с причиной (отклонить, скрыть) спрашивают её в окне,
 * подробности записи (номера и фото объекта) открываются в отдельном окне.
 */
export const ResourceSection = ({ config: sourceConfig, focusedId }: ResourceSectionProps) => {
  const lang = useAdminLanguage();
  const t = (text: string) => translateAdmin(text, lang);
  const config = translateResourceConfig(sourceConfig, lang);
  const router = useRouter();
  const lookups = useLookups();
  const {
    filters,
    filtersVersion,
    filtersActive,
    rows,
    tableStatus,
    refreshing,
    total,
    limit,
    offset,
    dialog,
    details,
    reasonTarget,
    reasonPending,
    reasonError,
    actionError,
    getRecordPath,
    handleFilterChange,
    handleResetFilters,
    handleOffsetChange,
    handlePageSizeChange,
    handleCreate,
    handleDialogClose,
    handleDetailsClose,
    handleReasonClose,
    handleReasonConfirm,
  } = useController(config);

  const columns: AdminColumn<Row>[] = [
    ...config.columns.map((column) => ({
      key: column.key,
      title: column.title,
      width: column.width,
      render: ({ record }: Row) => column.render(record, lookups),
    })),
    {
      key: 'actions',
      title: 'Действия',
      width: config.actionsColumnWidth,
      render: ({ actions, busy }: Row) => <RowActions actions={actions} disabled={busy} />,
    },
  ];

  return (
    <Stack {...rootStyle}>
      {(Boolean(config.filters?.length) || config.canCreate || !config.unpaginated) && (
        <Flex {...toolbarStyle}>
          <PageSizeSelect value={limit} onChange={handlePageSizeChange} />
          {config.filters?.map((filter) =>
            filter.type ? (
              <FilterInput
                key={`${filter.name}-${filtersVersion}`}
                label={filter.label}
                type={filter.type}
                value={filters[filter.name] ?? ''}
                onValueChange={handleFilterChange(filter.name)}
              />
            ) : (
              <FilterSelect
                key={filter.name}
                label={filter.label}
                value={filters[filter.name] ?? ''}
                options={[
                  { value: '', label: 'Все' },
                  ...(typeof filter.options === 'function'
                    ? filter.options(lookups)
                    : (filter.options ?? [])),
                ]}
                onValueChange={handleFilterChange(filter.name)}
              />
            )
          )}
          {filtersActive && (
            <chakra.button type="button" {...resetStyle} onClick={handleResetFilters}>
              {t('Сбросить фильтры')}
            </chakra.button>
          )}
          {config.canCreate && config.fields && (
            <Button size="sm" {...createButtonStyle} onClick={handleCreate}>
              {config.createLabel ?? t('Добавить')}
            </Button>
          )}
        </Flex>
      )}

      {actionError && <Text {...errorStyle}>{actionError}</Text>}

      <AdminTable
        tableId={config.key.startsWith('units-') ? 'units' : config.key}
        pinnedColumn={config.thumbnailColumn}
        columns={columns}
        rows={rows}
        getRowKey={getRowKey}
        status={tableStatus}
        refreshing={refreshing}
        emptyText={config.emptyText}
        fitToWidth={config.fitTableToWidth}
      />

      {total > limit && (
        <Pagination
          lang={lang}
          total={total}
          limit={limit}
          offset={offset}
          onOffsetChange={handleOffsetChange}
        />
      )}

      {dialog && config.fields && (
        <RecordDialog
          title={
            dialog.mode === 'create'
              ? (config.createLabel ?? 'Новая запись')
              : `${t('Изменить')}: ${config.recordName(dialog.record)}`
          }
          fields={config.fields}
          target={dialog}
          lookups={lookups}
          createPath={config.path}
          getRecordPath={getRecordPath}
          editContent={
            dialog.mode === 'edit' && config.editContent
              ? config.editContent(dialog.record)
              : undefined
          }
          onClose={handleDialogClose}
        />
      )}

      {reasonTarget?.action.reason && (
        <CancelDialog
          lang={lang}
          subject={config.recordName(reasonTarget.record)}
          title={reasonTarget.action.reason.title}
          confirmLabel={reasonTarget.action.reason.confirmLabel}
          reasonRequired
          pending={reasonPending}
          error={reasonError}
          onConfirm={handleReasonConfirm}
          onClose={handleReasonClose}
        />
      )}

      {details && config.details?.inline && (
        <Stack {...detailsContentStyle}>
          <Flex {...detailsHeaderStyle}>
            <Text {...detailsTitleStyle}>
              {config.details.label}: {config.recordName(details)}
            </Text>
            <IconButton label={t('Закрыть')} {...closeButtonStyle} onClick={handleDetailsClose}>
              <CloseIcon size={18} />
            </IconButton>
          </Flex>
          {config.details.render(details)}
        </Stack>
      )}

      {details && config.details && !config.details.inline && (
        <Dialog.Root open onOpenChange={handleDetailsClose} placement="center">
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content {...detailsContentStyle}>
                <Flex {...detailsHeaderStyle}>
                  <Dialog.Title {...detailsTitleStyle}>
                    {config.details.label}: {config.recordName(details)}
                  </Dialog.Title>
                  <IconButton
                    label={t('Закрыть')}
                    {...closeButtonStyle}
                    onClick={handleDetailsClose}
                  >
                    <CloseIcon size={18} />
                  </IconButton>
                </Flex>
                {config.details.render(details)}
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      )}
      {focusedId && (
        <LinkedRecordDialog
          config={config}
          id={focusedId}
          onClose={() =>
            router.replace(`/admin?tab=${encodeURIComponent(config.key)}`, { scroll: false })
          }
        />
      )}
    </Stack>
  );
};
