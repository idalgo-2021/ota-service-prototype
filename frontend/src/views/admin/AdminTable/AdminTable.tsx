'use client';

import { Box, chakra, Flex, Skeleton, Table, Text } from '@chakra-ui/react';
import { Card } from '@/shared/card';
import { translateAdmin, useAdminLanguage } from '../adminLocale';
import { useTableDisplay } from '../useTableDisplay';
import {
  cardStyle,
  cellStyle,
  getTableBodyStyle,
  headerCellStyle,
  messageStyle,
  skeletonStyle,
  tableStyle,
} from '../table.styles';

export type AdminColumn<T> = {
  key: string;
  title: string;
  width?: string;
  render: (row: T) => React.ReactNode;
};

export type AdminTableStatus = 'loading' | 'ready' | 'empty' | 'error';

type AdminTableProps<T> = {
  tableId: string;
  pinnedColumn?: string;
  columns: readonly AdminColumn<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  status: AdminTableStatus;
  /** Перезапрос с уже показанными данными: строки остаются, но приглушаются */
  refreshing: boolean;
  emptyText: string;
  fitToWidth?: boolean;
};

const SKELETON_ROWS = 5;

const stickyActionsCellStyle = {
  position: 'sticky',
  right: 0,
  zIndex: 1,
  bg: 'white',
  minW: '150px',
  overflow: 'hidden',
  boxShadow: '-6px 0 8px -8px rgba(0, 0, 0, 0.35)',
};

const stickyActionsHeaderStyle = {
  ...stickyActionsCellStyle,
  zIndex: 2,
  bg: '#f9f9fb',
};

const getActionsCellStyle = (fitToWidth: boolean, header = false) =>
  fitToWidth
    ? {
        position: 'static',
        minW: '0',
        overflow: 'hidden',
        boxShadow: 'none',
        ...(header ? { bg: '#f9f9fb' } : {}),
      }
    : header
      ? stickyActionsHeaderStyle
      : stickyActionsCellStyle;

const ERROR_TEXT = 'Не удалось загрузить данные. Попробуйте обновить страницу.';

/**
 * Таблица в белой карточке: заголовки колонок, строки по описанию колонок,
 * скелетон при первой загрузке и сообщение вместо строк, если показать нечего.
 */
export const AdminTable = <T,>({
  tableId,
  pinnedColumn,
  columns,
  rows,
  getRowKey,
  status,
  refreshing,
  emptyText,
  fitToWidth = false,
}: AdminTableProps<T>) => {
  const lang = useAdminLanguage();
  const t = (text: string) => translateAdmin(text, lang);
  const { selected, compact, saveColumns, toggleCompact } = useTableDisplay(tableId);
  const visibleColumns = columns.filter(
    (column) =>
      column.key === 'actions' ||
      column.key === pinnedColumn ||
      !selected ||
      selected.includes(column.key)
  );
  const toggleColumn = (key: string) => {
    const current = columns
      .filter(
        (column) =>
          column.key !== 'actions' &&
          column.key !== pinnedColumn &&
          (!selected || selected.includes(column.key))
      )
      .map((column) => column.key);
    saveColumns(current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };
  const renderBody = () => {
    if (status === 'loading') {
      return Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <Table.Row key={index}>
          {visibleColumns.map((column, columnIndex) => (
            <Table.Cell
              key={column.key}
              {...cellStyle}
              px={fitToWidth && columnIndex > 0 ? '6px' : undefined}
              style={columnIndex === 0 ? { paddingInlineStart: '18px' } : undefined}
              {...(column.width ? { w: column.width } : {})}
              {...(column.key === 'actions' ? getActionsCellStyle(fitToWidth) : {})}
              py={compact ? '6px' : '10px'}
            >
              <Skeleton {...skeletonStyle} />
            </Table.Cell>
          ))}
        </Table.Row>
      ));
    }
    if (status !== 'ready') {
      return (
        <Table.Row>
          <Table.Cell colSpan={visibleColumns.length} {...messageStyle}>
            {status === 'error' ? t(ERROR_TEXT) : t(emptyText)}
          </Table.Cell>
        </Table.Row>
      );
    }
    return rows.map((row) => (
      <Table.Row key={getRowKey(row)}>
        {visibleColumns.map((column, columnIndex) => (
          <Table.Cell
            key={column.key}
            {...cellStyle}
            px={fitToWidth && columnIndex > 0 ? '6px' : undefined}
            style={columnIndex === 0 ? { paddingInlineStart: '18px' } : undefined}
            {...(column.width ? { w: column.width } : {})}
            {...(column.key === 'actions' ? getActionsCellStyle(fitToWidth) : {})}
            py={compact ? '6px' : '10px'}
          >
            {column.render(row)}
          </Table.Cell>
        ))}
      </Table.Row>
    ));
  };

  return (
    <Card {...cardStyle}>
      <Flex
        alignItems="center"
        justifyContent="flex-end"
        gap="12px"
        px="12px"
        py="8px"
        bg="#f9f9fb"
        borderBottom="1px solid #e5e5ea"
      >
        <Box as="details" position="relative">
          <Box
            as="summary"
            cursor="pointer"
            fontSize="13px"
            fontWeight="500"
            color="#0E41D2"
            bg="#E7ECFB"
            borderRadius="8px"
            px="10px"
            py="6px"
          >
            {t('Колонки')}
          </Box>
          <Box
            position="absolute"
            right="0"
            zIndex="10"
            bg="white"
            boxShadow="0 8px 24px rgba(45, 49, 55, 0.14)"
            border="1px solid #e5e5ea"
            borderRadius="12px"
            p="12px"
            minW="180px"
          >
            {columns
              .filter((column) => column.key !== 'actions' && column.key !== pinnedColumn)
              .map((column) => (
                <Text
                  as="label"
                  key={column.key}
                  display="block"
                  whiteSpace="nowrap"
                  fontSize="13px"
                  py="3px"
                >
                  <input
                    type="checkbox"
                    checked={!selected || selected.includes(column.key)}
                    onChange={() => toggleColumn(column.key)}
                  />{' '}
                  {t(column.title)}
                </Text>
              ))}
          </Box>
        </Box>
        <chakra.button
          type="button"
          cursor="pointer"
          fontSize="13px"
          fontWeight="500"
          color="#0E41D2"
          bg="#E7ECFB"
          borderRadius="8px"
          px="10px"
          py="6px"
          aria-pressed={compact}
          onClick={toggleCompact}
          _hover={{ bg: '#F2F2F4' }}
        >
          {compact ? t('Обычный вид') : t('Компактный вид')}
        </chakra.button>
      </Flex>
      <Table.Root
        {...tableStyle}
        tableLayout={fitToWidth ? 'fixed' : undefined}
        minW={fitToWidth ? '100%' : undefined}
      >
        <Table.Header>
          <Table.Row>
            {visibleColumns.map((column, columnIndex) => (
              <Table.ColumnHeader
                key={column.key}
                {...headerCellStyle}
                px={fitToWidth && columnIndex > 0 ? '6px' : undefined}
                style={columnIndex === 0 ? { paddingInlineStart: '18px' } : undefined}
                {...(column.width ? { w: column.width } : {})}
                {...(column.key === 'actions' ? getActionsCellStyle(fitToWidth, true) : {})}
              >
                {t(column.title)}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body {...getTableBodyStyle(refreshing)}>{renderBody()}</Table.Body>
      </Table.Root>
    </Card>
  );
};
