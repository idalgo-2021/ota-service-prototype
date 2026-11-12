'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './hotel.module.css';
import { formatCount, formatRating, getDemoReviews, getPraise } from './reviews';

type ListingData = {
  id: string;
  title: string;
  description?: string | null;
  main_picture?: string | null;
  address?: string | null;
  average_overall_rating?: number | null;
  overall_rating_count?: number;
  features?: { id: number; name: string }[];
  images?: { id: string; url: string }[];
  starting_price?: { amount: string | number; currency: string } | null;
};

type Props = {
  listingId: string;
  onClose: () => void;
  onBook: () => void;
};

export function HotelDetailSheet({ listingId, onClose, onBook }: Props) {
  const [listing, setListing] = useState<ListingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const galleryRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const didDrag = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/listings/${listingId}?lang=ru`)
      .then((res) => {
        if (!res.ok) throw new Error('Listing not found');
        return res.json() as Promise<{ data: ListingData }>;
      })
      .then(({ data }) => {
        if (!cancelled && data) {
          setListing(data);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const allImages: string[] = [];
  if (listing?.main_picture) allImages.push(listing.main_picture);
  if (listing?.images) {
    for (const img of listing.images) {
      if (img.url && !allImages.includes(img.url)) {
        allImages.push(img.url);
      }
    }
  }

  const updateScrollState = useCallback(() => {
    const el = galleryRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);

    const itemWidth = 230; // 220px image width + 10px gap
    const idx = Math.min(
      Math.max(0, Math.round(scrollLeft / itemWidth)),
      allImages.length - 1
    );
    setActiveImageIndex(idx);
  }, [allImages.length]);

  useEffect(() => {
    updateScrollState();
  }, [allImages.length, updateScrollState]);

  const handleScroll = (direction: -1 | 1) => {
    const el = galleryRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 230, behavior: 'smooth' });
  };

  const handleSelectImage = (idx: number) => {
    const el = galleryRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * 230, behavior: 'smooth' });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = galleryRef.current;
    if (!el) return;
    isDragging.current = true;
    didDrag.current = false;
    dragStartX.current = e.pageX - el.offsetLeft;
    dragScrollLeft.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const el = galleryRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragStartX.current) * 1.2;
    if (Math.abs(walk) > 4) {
      didDrag.current = true;
    }
    el.scrollLeft = dragScrollLeft.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  const reviews = listing ? getDemoReviews({ id: listing.id, title: listing.title }) : null;
  const praise = reviews ? getPraise(reviews) : null;

  const startingPriceFormatted =
    listing?.starting_price?.amount != null
      ? `от ${new Intl.NumberFormat('ru-RU').format(Number(listing.starting_price.amount))} ₽ / ночь`
      : null;

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hotelTitle"
      >
        <div className={styles.handle} />

        {loading ? (
          <div className={styles.loading}>Загружаем информацию об отеле…</div>
        ) : error || !listing ? (
          <div className={styles.loading}>
            <p>Не удалось загрузить данные отеля.</p>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
              ×
            </button>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <div>
                <h2 id="hotelTitle">{listing.title}</h2>
                {listing.address && <p className={styles.address}>{listing.address}</p>}
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={onClose}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            {allImages.length > 0 && (
              <div className={styles.gallerySection}>
                <div className={styles.galleryWrapper}>
                  {allImages.length > 1 && canScrollLeft && (
                    <button
                      type="button"
                      className={`${styles.galleryArrow} ${styles.galleryArrowLeft}`}
                      onClick={() => handleScroll(-1)}
                      aria-label="Предыдущее фото"
                    >
                      ‹
                    </button>
                  )}

                  <div
                    ref={galleryRef}
                    className={styles.gallery}
                    onScroll={updateScrollState}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    aria-label="Фотографии отеля"
                  >
                    {allImages.map((src, idx) => (
                      <div key={`${src}-${idx}`} className={styles.galleryItem}>
                        <Image
                          src={src}
                          alt={`${listing.title} фото ${idx + 1}`}
                          fill
                          sizes="220px"
                          className={styles.galleryImage}
                          draggable={false}
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>

                  {allImages.length > 1 && canScrollRight && (
                    <button
                      type="button"
                      className={`${styles.galleryArrow} ${styles.galleryArrowRight}`}
                      onClick={() => handleScroll(1)}
                      aria-label="Следующее фото"
                    >
                      ›
                    </button>
                  )}

                  {allImages.length > 1 && (
                    <div className={styles.galleryCounter}>
                      {activeImageIndex + 1} / {allImages.length}
                    </div>
                  )}
                </div>

                {allImages.length > 1 && (
                  <div className={styles.galleryDots} role="tablist" aria-label="Слайды фотографий">
                    {allImages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        role="tab"
                        aria-selected={idx === activeImageIndex}
                        aria-label={`Фото ${idx + 1}`}
                        className={`${styles.galleryDot} ${
                          idx === activeImageIndex ? styles.galleryDotActive : ''
                        }`}
                        onClick={() => handleSelectImage(idx)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={styles.badges}>
              {reviews && (
                <span className={styles.ratingBadge}>
                  ★ {formatRating(reviews.rating)} · {formatCount(reviews.count, ['отзыв', 'отзыва', 'отзывов'])}
                </span>
              )}
              {startingPriceFormatted && (
                <span className={styles.priceBadge}>{startingPriceFormatted}</span>
              )}
            </div>

            {praise && (
              <p className={styles.praise}>
                <span className={styles.praiseIcon}>✨</span> Гости хвалят: {praise}
              </p>
            )}

            {listing.description && (
              <p className={styles.description}>{listing.description}</p>
            )}

            {listing.features && listing.features.length > 0 && (
              <div className={styles.features} aria-label="Удобства">
                {listing.features.map((f) => (
                  <span key={f.id} className={styles.featureChip}>
                    {f.name}
                  </span>
                ))}
              </div>
            )}

            <button type="button" className={styles.bookButton} onClick={onBook}>
              <span>Выбрать номер и даты</span>
              <span aria-hidden="true">→</span>
            </button>
          </>
        )}
      </section>
    </div>
  );
}
