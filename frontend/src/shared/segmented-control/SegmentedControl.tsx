'use client';

import { chakra } from '@chakra-ui/react';
import { Card } from '../card';
import { getOptionStyle, rootStyle } from './SegmentedControl.styles';
import { useController } from './useController';

export type SegmentedControlOption<T extends string> = {
  value: T;
  /** Видимая подпись сегмента */
  label: string;
  /** Подробное название для `aria-label` и подсказки; должно содержать `label` */
  title: string;
};

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
};

/**
 * Карточка с рядом кнопок-сегментов во всю ширину, из которых выбрана ровно одна
 * (например, «Все / Отели / Апартаменты»). Выбранный сегмент подсвечен рамкой и фоном.
 */
export const SegmentedControl = <T extends string>({
  options,
  value,
  onValueChange,
}: SegmentedControlProps<T>) => {
  const { items } = useController(options, onValueChange);

  return (
    <Card {...rootStyle}>
      {items.map((item) => (
        <chakra.button
          key={item.value}
          type="button"
          aria-pressed={item.value === value}
          aria-label={item.title}
          title={item.title}
          {...getOptionStyle(item.value === value)}
          onClick={item.handleSelect}
        >
          {item.label}
        </chakra.button>
      ))}
    </Card>
  );
};
