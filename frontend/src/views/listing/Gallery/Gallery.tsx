'use client';

import { Box, chakra, Flex, Image, Text } from '@chakra-ui/react';
import { IconButton } from '@/shared/icon-button';
import { ImageCarousel } from '@/shared/image-carousel';
import {
  arrowStyle,
  controlsStyle,
  counterStyle,
  getRootStyle,
  getThumbStyle,
  imageStyle,
  mainStyle,
  moreStyle,
  thumbImageStyle,
  thumbsStyle,
} from './Gallery.styles';
import { useController } from './useController';

type GalleryProps = {
  images: readonly string[];
  /** Название объекта — подпись фото для скринридеров */
  title: string;
};

/**
 * Фото объекта: большое слева со стрелками и счётчиком «1 / 24», справа до четырёх
 * миниатюр, на последней — «+N фото», если фото больше. Клик по миниатюре открывает её
 * в большом окне. Одно фото занимает всю ширину; на узком экране миниатюр нет.
 */
export const Gallery = ({ images, title }: GalleryProps) => {
  const { current, count, thumbs, handlePrev, handleNext, handleSelect } = useController(images);
  const showPrevious = () => handlePrev();
  const showNext = () => handleNext();
  const selectImage = (index: number) => () => {
    handleSelect(index)();
  };

  return (
    <Box {...getRootStyle(thumbs.length > 0)}>
      <Box {...mainStyle}>
        {count > 0 && (
          <ImageCarousel
            images={images}
            title={title}
            imageStyle={imageStyle}
            activeIndex={current}
            onActiveIndexChange={(index) => handleSelect(index)()}
            showArrows={false}
            showIndicators={false}
          />
        )}
        {count > 0 && (
          <Flex {...controlsStyle}>
            {count > 1 && (
              <IconButton
                label="Предыдущее фото"
                data-gallery-arrow
                {...arrowStyle}
                onClick={showPrevious}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m14.5 5-7 7 7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>
            )}
            <Text {...counterStyle}>{count === 1 ? '1' : `${current + 1} / ${count}`}</Text>
            {count > 1 && (
              <IconButton
                label="Следующее фото"
                data-gallery-arrow
                {...arrowStyle}
                onClick={showNext}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m9.5 5 7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>
            )}
          </Flex>
        )}
      </Box>

      {thumbs.length > 0 && (
        <Box {...thumbsStyle}>
          {thumbs.map((thumb, position) => (
            <chakra.button
              key={thumb.index}
              type="button"
              aria-label={thumb.more ? `Еще ${thumb.more} фото` : `Открыть фото ${thumb.index + 1}`}
              {...getThumbStyle(position, thumbs.length)}
              onClick={selectImage(thumb.index)}
            >
              <Image src={thumb.url} alt="" {...thumbImageStyle} />
              {thumb.more > 0 && <chakra.span {...moreStyle}>+{thumb.more} фото</chakra.span>}
            </chakra.button>
          ))}
        </Box>
      )}
    </Box>
  );
};
