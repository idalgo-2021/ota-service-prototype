'use client';

import { Slider as ChakraSlider } from '@chakra-ui/react';
import { forwardRef } from 'react';
import { controlStyle, rangeStyle, thumbStyle, trackStyle } from './Range.styles';

export type RangeProps = ChakraSlider.RootProps;

/**
 * Горизонтальный ползунок: трек, закрашенный отрезок выбранного диапазона и ручки.
 */
export const Range = forwardRef<HTMLDivElement, RangeProps>(function Range(props, ref) {
  return (
    <ChakraSlider.Root ref={ref} {...props}>
      <ChakraSlider.Control {...controlStyle}>
        <ChakraSlider.Track {...trackStyle}>
          <ChakraSlider.Range {...rangeStyle} />
        </ChakraSlider.Track>
        <ChakraSlider.Thumbs {...thumbStyle} />
      </ChakraSlider.Control>
    </ChakraSlider.Root>
  );
});
