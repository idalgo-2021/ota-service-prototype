'use client';

import { Box, Image } from '@chakra-ui/react';
import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { SystemStyleObject } from '@chakra-ui/react';
import styles from './ImageCarousel.module.css';

type ImageCarouselProps = {
  images: readonly string[];
  title: string;
  imageStyle: SystemStyleObject;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  showArrows?: boolean;
  showIndicators?: boolean;
};

const wrap = (index: number, count: number) => (index + count) % count;

export const ImageCarousel = ({
  images,
  title,
  imageStyle,
  activeIndex,
  onActiveIndexChange,
  showArrows = true,
  showIndicators = true,
}: ImageCarouselProps) => {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [rebasing, setRebasing] = useState(false);
  const [trackPosition, setTrackPosition] = useState(images.length);
  const pointerStart = useRef<{ id: number; x: number; y: number; width: number } | null>(null);
  const clickBlockedUntil = useRef(0);
  const previousActiveIndex = useRef(activeIndex ?? 0);
  const pendingActiveIndex = useRef<number | null>(null);
  const count = images.length;
  const currentIndex = activeIndex === undefined ? index : wrap(activeIndex, Math.max(count, 1));

  useEffect(() => {
    if (activeIndex === undefined || activeIndex === previousActiveIndex.current) {return;}
    const previous = previousActiveIndex.current;
    const forward = wrap(activeIndex - previous, count);
    const delta = forward <= count / 2 ? forward : forward - count;
    if (pendingActiveIndex.current === activeIndex) {pendingActiveIndex.current = null;}
    else if (count > 1 && delta !== 0) {setTrackPosition((value) => value + delta);}
    previousActiveIndex.current = activeIndex;
  }, [activeIndex, count]);

  const move = useCallback((direction: -1 | 1) => {
    if (count < 2) {return;}
    const nextIndex = wrap(currentIndex + direction, count);
    setTrackPosition((value) => value + direction);
    if (activeIndex === undefined) {setIndex(nextIndex);}
    else {
      pendingActiveIndex.current = nextIndex;
      onActiveIndexChange?.(nextIndex);
    }
    setDragX(0);
  }, [activeIndex, count, currentIndex, onActiveIndexChange]);

  const selectIndex = (nextIndex: number) => {
    const forward = wrap(nextIndex - currentIndex, count);
    const delta = forward <= count / 2 ? forward : forward - count;
    if (delta === 0) {return;}
    setTrackPosition((value) => value + delta);
    if (activeIndex === undefined) {setIndex(nextIndex);}
    else {
      pendingActiveIndex.current = nextIndex;
      onActiveIndexChange?.(nextIndex);
    }
    setDragX(0);
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (count < 2 || event.button !== 0 || (event.target as HTMLElement).closest('button')) {return;}
    pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY, width: event.currentTarget.clientWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId) {return;}
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {return;}
    setDragX(dx);
  };

  const finishPointer = (event: PointerEvent<HTMLElement>) => {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId) {return;}
    pointerStart.current = null;
    setDragging(false);
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 8) {clickBlockedUntil.current = Date.now() + 450;}
    if (Math.abs(dx) > Math.min(56, start.width * 0.16)) {move(dx < 0 ? 1 : -1);}
    else {setDragX(0);}
  };

  const handleTrackTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'transform' || count < 2) {return;}
    if (trackPosition >= count * 2 || trackPosition < count) {
      setTrackPosition((value) => count + (((value - count) % count) + count) % count);
      setRebasing(true);
    }
  };

  useEffect(() => {
    if (!rebasing) {return;}
    const frame = requestAnimationFrame(() => setRebasing(false));
    return () => cancelAnimationFrame(frame);
  }, [rebasing]);

  const stopCardClick = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const slides = [...images, ...images, ...images];

  return (
    <Box
      className={styles.root}
      {...imageStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onClickCapture={(event) => {
        if (Date.now() < clickBlockedUntil.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {count > 0 && (
        <div
          className={`${styles.track} ${dragging ? styles.dragging : ''} ${rebasing ? styles.noTransition : ''}`}
          style={{
            '--slide-count': count,
            '--track-position': trackPosition,
            '--drag-x': `${dragX}px`,
          } as React.CSSProperties}
          onTransitionEnd={handleTrackTransitionEnd}
        >
          {slides.map((src, slidePosition) => (
            <Image
              key={slidePosition}
              className={styles.image}
              src={src}
              alt={slidePosition === trackPosition ? (count > 1 ? `${title}, фото ${currentIndex + 1} из ${count}` : title) : ''}
              aria-hidden={slidePosition !== trackPosition}
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
            />
          ))}
        </div>
      )}
      {count > 1 && showArrows && (
        <>
          {currentIndex > 0 && (
            <button
              type="button"
              className={`${styles.arrow} ${styles.previous}`}
              aria-label={`Предыдущее фото: ${title}`}
              onClick={(event) => {
                stopCardClick(event);
                move(-1);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m14.5 5-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {currentIndex < count - 1 && (
            <button
              type="button"
              className={`${styles.arrow} ${styles.next}`}
              aria-label={`Следующее фото: ${title}`}
              onClick={(event) => {
                stopCardClick(event);
                move(1);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m9.5 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </>
      )}
      {count > 1 && (
        <div className={styles.counter}>
          {currentIndex + 1} / {count}
        </div>
      )}
      {count > 1 && showIndicators && (
        <div className={styles.dots} role="group" aria-label="Выбор фотографии">
          {images.map((_, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              className={`${styles.dot} ${dotIndex === currentIndex ? styles.activeDot : ''}`}
              aria-label={`Фото ${dotIndex + 1} из ${count}`}
              aria-current={dotIndex === currentIndex ? 'true' : undefined}
              onClick={(event) => {
                stopCardClick(event);
                selectIndex(dotIndex);
              }}
            />
          ))}
        </div>
      )}
    </Box>
  );
};
