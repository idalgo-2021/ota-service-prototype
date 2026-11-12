'use client';

import { Box, chakra, Image, Stack, Text } from '@chakra-ui/react';
import { Button } from '@/shared/button';
import { IconButton } from '@/shared/icon-button';
import { CloseIcon } from '@/shared/icons';
import { Input } from '@/shared/input';
import {
  addButtonStyle,
  addFormStyle,
  addInputStyle,
  emptyStyle,
  errorStyle,
  gridStyle,
  imageStyle,
  orderStyle,
  removeStyle,
  rootStyle,
  tileStyle,
} from './ImagesEditor.styles';
import { useController } from './useController';
import { translateAdmin, useAdminLanguage } from '../../adminLocale';

export type EditableImage = { id: string; url: string; sort_order: number };

type ImagesEditorProps = {
  images: EditableImage[];
  emptyText?: string;
  /** Куда добавлять фото (POST) и откуда удалять (DELETE `addPath/{id}`). */
  addPath: string;
};

/**
 * Галерея с правкой: плитки фото по порядку показа с номером и крестиком удаления,
 * под ними поле для ссылки на новое фото — оно встаёт в конец.
 */
export const ImagesEditor = ({
  images,
  addPath,
  emptyText = 'Фото пока нет.',
}: ImagesEditorProps) => {
  const lang = useAdminLanguage();
  const t = (text: string) => translateAdmin(text, lang);
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const nextSortOrder = sorted.length ? sorted[sorted.length - 1].sort_order + 1 : 0;
  const { url, adding, removingPath, error, handleUrlChange, handleAdd, handleRemove } =
    useController(addPath, nextSortOrder);

  return (
    <Stack {...rootStyle}>
      {sorted.length ? (
        <Box {...gridStyle}>
          {sorted.map((image, index) => {
            const path = `${addPath}/${image.id}`;
            return (
              <Box key={image.id} {...tileStyle}>
                <Image src={image.url} alt="" {...imageStyle} />
                <Text {...orderStyle}>{index + 1}</Text>
                <IconButton
                  label={t('Удалить фото')}
                  disabled={removingPath === path}
                  {...removeStyle}
                  onClick={() => handleRemove(path)}
                >
                  <CloseIcon size={16} />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Text {...emptyStyle}>{t(emptyText)}</Text>
      )}
      <chakra.div {...addFormStyle}>
        <Box {...addInputStyle}>
          <Input
            type="url"
            placeholder={t('https://… ссылка на фото')}
            aria-label={t('Ссылка на новое фото')}
            value={url}
            onChange={handleUrlChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleAdd();
              }
            }}
          />
        </Box>
        <Button
          type="button"
          {...addButtonStyle}
          onClick={() => void handleAdd()}
          loading={adding}
          disabled={!url.trim()}
        >
          {t('Добавить фото')}
        </Button>
      </chakra.div>
      {error && (
        <Text role="alert" {...errorStyle}>
          {error}
        </Text>
      )}
    </Stack>
  );
};
