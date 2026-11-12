'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookingCalendar } from './BookingCalendar';
import { BookingFlow } from './BookingFlow';
import {
  addDaysIso,
  formatRuDate,
  formatRuShort,
  getTodayIso,
  normalizeBookingDateRange,
} from './dateUtils';
import { HotelDetailSheet } from './HotelDetailSheet';
import { RuDateInput } from './RuDateInput';
import styles from './page.module.css';

type FeedClip = {
  id: string;
  demo_id?: string;
  type?: 'listing' | 'location' | 'general';
  src: string;
  title: string;
  subtitle: string;
  author: string;
  listing_id?: string | null;
  location_id?: number | null;
};

type LocationItem = {
  id: number;
  country_id: number;
  name: string;
  name_ru?: string;
};

const filterOptions = ['У воды', 'Завтрак', 'Спа', 'Можно с питомцем', 'Парковка'];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h4m4 0h8M4 17h8m4 0h4" />
      <circle cx="10" cy="7" r="2" />
      <circle cx="14" cy="17" r="2" />
    </svg>
  );
}

export default function FeedPage() {
  const [clips, setClips] = useState<FeedClip[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const preparedVideos = useRef(new Map<number, { src: string; destroy: () => void }>());
  const playbackState = useRef({ active: 0, allowed: true });
  const [active, setActive] = useState(0);

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [cityName, setCityName] = useState('Все направления');

  const [sheet, setSheet] = useState<'search' | 'filters' | null>(null);
  const [detailListingId, setDetailListingId] = useState<string | null>(null);

  const [checkin, setCheckin] = useState(() => getTodayIso());
  const [checkout, setCheckout] = useState(() => addDaysIso(getTodayIso(), 1));
  const [guests, setGuests] = useState(1);
  const [filters, setFilters] = useState<string[]>([]);
  const [liked, setLiked] = useState<number[]>([]);
  const [muted, setMuted] = useState(true);
  const [playBlocked, setPlayBlocked] = useState(false);
  const [dateError, setDateError] = useState('');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingStarted, setBookingStarted] = useState(false);

  useEffect(() => {
    const today = getTodayIso();
    setCheckin((prev) => (!prev || prev < today ? today : prev));
    setCheckout((prev) => {
      const effectiveCheckin = !checkin || checkin < today ? today : checkin;
      const minCheckout = addDaysIso(effectiveCheckin, 1);
      return !prev || prev <= effectiveCheckin ? minCheckout : prev;
    });
  }, []);

  const handleCheckinChange = (value: string) => {
    const today = getTodayIso();
    if (!value) {
      setCheckin(today);
      setDateError('');
      if (checkout <= today) {
        setCheckout(addDaysIso(today, 1));
      }
      return;
    }
    if (value < today) {
      setDateError('Дата заезда не может быть меньше текущей.');
      setCheckin(today);
      if (checkout <= today) {
        setCheckout(addDaysIso(today, 1));
      }
      return;
    }
    setDateError('');
    setCheckin(value);
    // Если новый заезд догнал или превысил прежний выезд,
    // автоматически сдвигаем дату выезда на следующий день (как на фронтенде)
    if (!checkout || checkout <= value) {
      setCheckout(addDaysIso(value, 1));
    }
  };

  const handleCheckoutChange = (value: string) => {
    if (!value) {
      setCheckout('');
      setDateError('Укажите дату выезда.');
      return;
    }
    if (checkin && value <= checkin) {
      setDateError('Дата заезда не может быть больше даты выезда.');
      setCheckout(value);
      return;
    }
    setDateError('');
    setCheckout(value);
  };

  const handleApplyDates = () => {
    const today = getTodayIso();
    if (!checkin) {
      setDateError('Укажите дату заезда.');
      return;
    }
    if (!checkout) {
      setDateError('Укажите дату выезда.');
      return;
    }
    if (checkin < today) {
      setDateError('Дата заезда не может быть меньше текущей.');
      return;
    }
    if (checkout <= checkin) {
      setDateError('Дата заезда не может быть больше даты выезда.');
      return;
    }
    setDateError('');
    setSheet(null);
  };

  type GroupedListing = {
    key: string;
    listingId: string | null;
    clips: {
      clip: FeedClip;
      globalIndex: number;
    }[];
  };

  const groupedClips = useMemo(() => {
    const groups: GroupedListing[] = [];
    const listingMap = new Map<string, GroupedListing>();

    clips.forEach((clip, globalIndex) => {
      if (clip.listing_id) {
        const existing = listingMap.get(clip.listing_id);
        if (existing) {
          existing.clips.push({ clip, globalIndex });
        } else {
          const group: GroupedListing = {
            key: `listing-${clip.listing_id}`,
            listingId: clip.listing_id,
            clips: [{ clip, globalIndex }],
          };
          listingMap.set(clip.listing_id, group);
          groups.push(group);
        }
      } else {
        groups.push({
          key: `clip-${clip.id || globalIndex}`,
          listingId: null,
          clips: [{ clip, globalIndex }],
        });
      }
    });

    return groups;
  }, [clips]);

  const currentGroupIndex = useMemo(() => {
    return groupedClips.findIndex((g) => g.clips.some((c) => c.globalIndex === active));
  }, [groupedClips, active]);

  const currentGroup = currentGroupIndex >= 0 ? groupedClips[currentGroupIndex] : undefined;
  const currentItemIndex = currentGroup
    ? currentGroup.clips.findIndex((c) => c.globalIndex === active)
    : 0;
  const currentGroupTotal = currentGroup ? currentGroup.clips.length : 1;

  const [subActiveIndex, setSubActiveIndex] = useState<Record<string, number>>({});

  useEffect(() => {
    if (currentGroup && currentItemIndex >= 0) {
      setSubActiveIndex((prev) =>
        prev[currentGroup.key] === currentItemIndex
          ? prev
          : { ...prev, [currentGroup.key]: currentItemIndex }
      );
    }
  }, [currentGroup, currentItemIndex]);

  useEffect(() => {
    playbackState.current = {
      active,
      allowed: !sheet && !bookingOpen && !bookingStarted && !detailListingId,
    };
  }, [active, sheet, bookingOpen, bookingStarted, detailListingId]);

  // Load locations dictionary from backend
  useEffect(() => {
    let cancelled = false;
    fetch('/api/locations?lang=ru')
      .then((res) => {
        if (!res.ok) throw new Error('Locations unavailable');
        return res.json() as Promise<{ data: LocationItem[] }>;
      })
      .then(({ data }) => {
        if (!cancelled && Array.isArray(data)) {
          setLocations(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load locations', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load feed clips with optional location filter
  useEffect(() => {
    let cancelled = false;
    setFeedLoading(true);
    setFeedError(false);

    const url = selectedLocationId
      ? `/api/feed/clips?location_id=${selectedLocationId}`
      : '/api/feed/clips';

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Feed unavailable');
        }
        return response.json() as Promise<{ data: FeedClip[] }>;
      })
      .then(({ data }) => {
        if (!cancelled && Array.isArray(data)) {
          setClips(data);
          setActive(0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFeedError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFeedLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedLocationId]);

  useEffect(() => {
    let cancelled = false;
    if (bookingStarted) {
      for (const prepared of preparedVideos.current.values()) {
        prepared.destroy();
      }
      preparedVideos.current.clear();
      return;
    }

    const wantedSet = new Set<number>();
    wantedSet.add(active);

    if (currentGroup) {
      if (currentItemIndex + 1 < currentGroup.clips.length) {
        wantedSet.add(currentGroup.clips[currentItemIndex + 1].globalIndex);
      }
      if (currentItemIndex - 1 >= 0) {
        wantedSet.add(currentGroup.clips[currentItemIndex - 1].globalIndex);
      }
    }
    if (currentGroupIndex + 1 < groupedClips.length) {
      wantedSet.add(groupedClips[currentGroupIndex + 1].clips[0].globalIndex);
    }
    if (currentGroupIndex - 1 >= 0) {
      wantedSet.add(groupedClips[currentGroupIndex - 1].clips[0].globalIndex);
    }

    const wanted = Array.from(wantedSet).filter(
      (index) => index >= 0 && index < clips.length
    );
    for (const [index, prepared] of preparedVideos.current) {
      if (!wanted.includes(index) || prepared.src !== clips[index]?.src) {
        prepared.destroy();
        preparedVideos.current.delete(index);
      }
    }

    async function prepare() {
      const needsHls = wanted.some((index) => {
        const video = videoRefs.current[index];
        return video && !video.canPlayType('application/vnd.apple.mpegurl');
      });
      const Hls = needsHls ? (await import('hls.js')).default : null;
      if (cancelled) {
        return;
      }
      for (const index of wanted) {
        const video = videoRefs.current[index];
        if (!video || preparedVideos.current.has(index)) {
          continue;
        }
        const source = clips[index].src;
        video.preload = 'auto';
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          const playWhenReady = () => {
            if (playbackState.current.active === index && playbackState.current.allowed) {
              void video
                .play()
                .then(() => setPlayBlocked(false))
                .catch(() => setPlayBlocked(true));
            }
          };
          video.addEventListener('canplay', playWhenReady);
          video.src = source;
          video.load();
          preparedVideos.current.set(index, {
            src: source,
            destroy: () => {
              video.removeEventListener('canplay', playWhenReady);
              video.pause();
              video.removeAttribute('src');
              video.load();
            },
          });
          continue;
        }
        if (!Hls?.isSupported()) {
          if (index === active) {
            setPlayBlocked(true);
          }
          continue;
        }
        const hls = new Hls({ maxBufferLength: 8, maxMaxBufferLength: 12 });
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (playbackState.current.active === index && playbackState.current.allowed) {
            void video
              .play()
              .then(() => setPlayBlocked(false))
              .catch(() => setPlayBlocked(true));
          }
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && playbackState.current.active === index) {
            setPlayBlocked(true);
          }
        });
        hls.attachMedia(video);
        hls.loadSource(source);
        preparedVideos.current.set(index, {
          src: source,
          destroy: () => {
            video.pause();
            hls.destroy();
            video.removeAttribute('src');
            video.load();
          },
        });
      }
    }
    void prepare();
    return () => {
      cancelled = true;
    };
  }, [active, clips, bookingStarted]);

  useEffect(() => {
    const instances = preparedVideos.current;
    return () => {
      for (const prepared of instances.values()) {
        prepared.destroy();
      }
      instances.clear();
    };
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) {
        return;
      }
      if (index === active && !sheet && !bookingOpen && !bookingStarted && !detailListingId) {
        if (!preparedVideos.current.has(index)) {
          return;
        }
        void video
          .play()
          .then(() => setPlayBlocked(false))
          .catch(() => setPlayBlocked(true));
      } else {
        video.pause();
      }
    });
  }, [active, sheet, bookingOpen, bookingStarted, detailListingId, muted]);

  useEffect(() => {
    const root = feedRef.current;
    if (!root) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) {
              setActive(idx);
            }
          }
        });
      },
      { root, threshold: [0.6] }
    );
    root.querySelectorAll('[data-index]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [clips.length, groupedClips.length]);

  useEffect(() => {
    if (!sheet) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSheet(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheet]);

  function showClip(index: number) {
    if (index < 0 || index >= clips.length) {
      return;
    }
    const root = feedRef.current;
    if (!root) {
      return;
    }
    const target = root.querySelector(`[data-index="${index}"]`) as HTMLElement | null;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      const parentTrack = target.parentElement as HTMLElement | null;
      if (parentTrack && parentTrack.classList.contains(styles.horizontalTrack)) {
        parentTrack.scrollTo({
          left: target.offsetLeft,
          behavior: 'smooth',
        });
      }
    }
    setActive(index);
  }

  function showGroup(groupIndex: number) {
    if (groupIndex < 0 || groupIndex >= groupedClips.length) {
      return;
    }
    const group = groupedClips[groupIndex];
    if (!group || !group.clips.length) {
      return;
    }
    const rememberedIndex = subActiveIndex[group.key] ?? 0;
    const targetItem = group.clips[rememberedIndex] ?? group.clips[0];
    showClip(targetItem.globalIndex);
  }

  const handleHorizontalScroll = (groupIndex: number, e: React.UIEvent<HTMLDivElement>) => {
    const track = e.currentTarget;
    const width = track.clientWidth;
    if (width <= 0) return;
    const itemIndex = Math.round(track.scrollLeft / width);
    const group = groupedClips[groupIndex];
    if (group && group.clips[itemIndex]) {
      const globalIdx = group.clips[itemIndex].globalIndex;
      if (active !== globalIdx) {
        const rect = track.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        if (rect.top >= -rect.height / 2 && rect.bottom <= windowHeight + rect.height / 2) {
          setActive(globalIdx);
        }
      }
    }
  };

  useEffect(() => {
    if (sheet || bookingOpen || bookingStarted || detailListingId) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        showGroup(currentGroupIndex - 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        showGroup(currentGroupIndex + 1);
      } else if (e.key === 'ArrowLeft') {
        if (currentGroup && currentItemIndex > 0) {
          e.preventDefault();
          showClip(currentGroup.clips[currentItemIndex - 1].globalIndex);
        }
      } else if (e.key === 'ArrowRight') {
        if (currentGroup && currentItemIndex < currentGroup.clips.length - 1) {
          e.preventDefault();
          showClip(currentGroup.clips[currentItemIndex + 1].globalIndex);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    sheet,
    bookingOpen,
    bookingStarted,
    detailListingId,
    currentGroupIndex,
    currentItemIndex,
    currentGroup,
    groupedClips,
  ]);

  const datesLabel =
    checkin && checkout
      ? `${formatRuShort(checkin)} — ${formatRuShort(checkout)}`
      : 'Выберите даты';

  return (
    <>
      {bookingStarted && checkin && checkout ? (
        <BookingFlow
          key={`${checkin}-${checkout}`}
          city={cityName}
          checkin={checkin}
          checkout={checkout}
          guests={guests}
          onGuestsChange={setGuests}
          onEditDates={() => setBookingOpen(true)}
          onBackToFeed={() => setBookingStarted(false)}
        />
      ) : (
        <main className={styles.root}>
          <div className={styles.stage}>
            <div
              className={styles.feed}
              ref={feedRef}
              aria-label="Лента видео об отелях и путешествиях"
            >
              {groupedClips.map((group, groupIndex) => {
                const isGroupActive = groupIndex === currentGroupIndex;
                const itemInGroupIndex = subActiveIndex[group.key] ?? (isGroupActive ? currentItemIndex : 0);
                const totalInGroup = group.clips.length;

                return (
                  <div
                    key={group.key}
                    className={styles.groupSlide}
                    data-group-index={groupIndex}
                  >
                    {/* Индикатор количества роликов у объекта: схема 1/3 + кликабельные точки */}
                    {totalInGroup > 1 && (
                      <div
                        className={styles.carouselIndicator}
                        aria-label={`Видео ${itemInGroupIndex + 1} из ${totalInGroup}`}
                      >
                        <span className={styles.carouselBadgeText}>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="m10 9 5 3-5 3V9z" />
                          </svg>
                          {itemInGroupIndex + 1} / {totalInGroup}
                        </span>
                        <div
                          className={styles.carouselDots}
                          role="tablist"
                          aria-label="Видеоролики объекта"
                        >
                          {group.clips.map((item, dotIdx) => (
                            <button
                              key={item.globalIndex}
                              type="button"
                              className={`${styles.carouselDot} ${dotIdx === itemInGroupIndex ? styles.carouselDotActive : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                showClip(item.globalIndex);
                              }}
                              aria-label={`Перейти к видео ${dotIdx + 1} из ${totalInGroup}`}
                              title={`Видео ${dotIdx + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Стрелки переключения влево/вправо внутри объекта */}
                    {totalInGroup > 1 && itemInGroupIndex > 0 && (
                      <button
                        type="button"
                        className={`${styles.navChevron} ${styles.navChevronLeft}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          showClip(group.clips[itemInGroupIndex - 1].globalIndex);
                        }}
                        aria-label="Предыдущее видео этого отеля"
                        title="Предыдущее видео отеля"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m15 18-6-6 6-6" />
                        </svg>
                      </button>
                    )}
                    {totalInGroup > 1 && itemInGroupIndex < totalInGroup - 1 && (
                      <button
                        type="button"
                        className={`${styles.navChevron} ${styles.navChevronRight}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          showClip(group.clips[itemInGroupIndex + 1].globalIndex);
                        }}
                        aria-label="Следующее видео этого отеля"
                        title="Следующее видео отеля"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </button>
                    )}

                    <div
                      className={styles.horizontalTrack}
                      onScroll={(e) => handleHorizontalScroll(groupIndex, e)}
                    >
                      {group.clips.map(({ clip, globalIndex }, itemIndex) => (
                        <section
                          className={styles.slide}
                          data-index={globalIndex}
                          data-group-index={groupIndex}
                          data-item-index={itemIndex}
                          key={clip.src}
                          aria-label={`Видео ${itemIndex + 1} из ${totalInGroup}: ${clip.title}`}
                        >
                          <video
                            ref={(node) => {
                              videoRefs.current[globalIndex] = node;
                            }}
                            playsInline
                            muted={muted}
                            loop
                            preload={globalIndex === 0 ? 'auto' : 'metadata'}
                            aria-label={clip.title}
                          />
                          {active === globalIndex && playBlocked && (
                            <button
                              type="button"
                              className={styles.playButton}
                              onClick={() => {
                                void videoRefs.current[globalIndex]
                                  ?.play()
                                  .then(() => setPlayBlocked(false))
                                  .catch(() => setPlayBlocked(true));
                              }}
                              aria-label="Воспроизвести видео со звуком"
                            >
                              ▶
                            </button>
                          )}
                          <div className={styles.shade} />
                          <div className={styles.caption}>
                            {totalInGroup > 1 && (
                              <div className={styles.captionBadge}>
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <rect x="2" y="4" width="20" height="16" rx="2" />
                                  <path d="m10 9 5 3-5 3V9z" />
                                </svg>
                                <span>
                                  {itemIndex + 1} из {totalInGroup} · Видео объекта
                                </span>
                              </div>
                            )}
                            <span className={styles.author}>{clip.author}</span>
                            <h1>{clip.title}</h1>
                            <p>{clip.subtitle}</p>
                          </div>
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={`${styles.iconButton} ${liked.includes(globalIndex) ? styles.liked : ''}`}
                              onClick={() =>
                                setLiked((previous) =>
                                  previous.includes(globalIndex)
                                    ? previous.filter((item) => item !== globalIndex)
                                    : [...previous, globalIndex]
                                )
                              }
                              aria-label={
                                liked.includes(globalIndex) ? 'Убрать отметку нравится' : 'Нравится'
                              }
                              aria-pressed={liked.includes(globalIndex)}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
                              </svg>
                              <small>Нравится</small>
                            </button>
                            <button
                              type="button"
                              className={styles.iconButton}
                              onClick={() => setMuted((value) => !value)}
                              aria-label={muted ? 'Включить звук' : 'Выключить звук'}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                                <path
                                  d={
                                    muted
                                      ? 'm16 9 5 6m0-6-5 6'
                                      : 'M15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12'
                                  }
                                />
                              </svg>
                              <small>Звук</small>
                            </button>
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                );
              })}
              {clips.length === 0 && (
                <div className={styles.emptyFeed} role="status">
                  {feedLoading
                    ? 'Загружаем видео…'
                    : feedError
                      ? 'Не удалось загрузить видео.'
                      : 'Пока нет видео для выбранного направления.'}
                </div>
              )}
            </div>

            <header className={styles.top}>
              <span className={styles.brand}>
                musya<span>.</span>
              </span>
              <div className={styles.topControls}>
                <button
                  type="button"
                  className={styles.searchButton}
                  onClick={() => setSheet('search')}
                  aria-label="Выбрать город, даты и гостей"
                >
                  <SearchIcon />
                  <span>
                    <strong>{cityName}</strong>
                    <small>
                      {datesLabel} · {guests} гост.
                    </small>
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.filterButton}
                  onClick={() => setSheet('filters')}
                  aria-label={
                    filters.length > 0
                      ? `Открыть фильтры, выбрано: ${filters.length}`
                      : 'Открыть фильтры'
                  }
                  title="Фильтры"
                >
                  <FilterIcon />
                  {filters.length > 0 && (
                    <span className={styles.filterCount}>{filters.length}</span>
                  )}
                </button>
              </div>
            </header>

            <button
              type="button"
              className={styles.booking}
              onClick={() => {
                const current = clips[active];
                if (current?.listing_id) {
                  setDetailListingId(current.listing_id);
                } else {
                  setSheet('search');
                }
              }}
            >
              <span>
                {clips[active]?.listing_id ? 'Об отеле и бронь' : 'Выбрать направление'}
              </span>
              <span aria-hidden="true">→</span>
            </button>

            <nav className={styles.arrows} aria-label="Переключить видео">
              <button
                type="button"
                onClick={() => showGroup(currentGroupIndex - 1)}
                disabled={currentGroupIndex <= 0}
                aria-label="Предыдущий объект"
                title="Предыдущий объект"
              >
                ↑
              </button>
              {currentGroupTotal > 1 && (
                <div className={styles.horizontalArrowsRow}>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentGroup && currentItemIndex > 0) {
                        showClip(currentGroup.clips[currentItemIndex - 1].globalIndex);
                      }
                    }}
                    disabled={currentItemIndex <= 0}
                    aria-label="Предыдущее видео объекта"
                    title="Предыдущее видео объекта"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentGroup && currentItemIndex < currentGroup.clips.length - 1) {
                        showClip(currentGroup.clips[currentItemIndex + 1].globalIndex);
                      }
                    }}
                    disabled={currentItemIndex >= currentGroupTotal - 1}
                    aria-label="Следующее видео объекта"
                    title="Следующее видео объекта"
                  >
                    →
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => showGroup(currentGroupIndex + 1)}
                disabled={currentGroupIndex >= groupedClips.length - 1}
                aria-label="Следующий объект"
                title="Следующий объект"
              >
                ↓
              </button>
            </nav>
          </div>

          {sheet && (
            <div
              className={styles.backdrop}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setSheet(null);
                }
              }}
            >
              <section
                className={styles.sheet}
                role="dialog"
                aria-modal="true"
                aria-labelledby="sheetTitle"
              >
                <div className={styles.handle} />
                <div className={styles.sheetHeader}>
                  <h2 id="sheetTitle">{sheet === 'search' ? 'Ваша поездка' : 'Фильтры'}</h2>
                  <button
                    type="button"
                    className={styles.close}
                    onClick={() => setSheet(null)}
                    aria-label="Закрыть"
                  >
                    ×
                  </button>
                </div>
                {sheet === 'search' ? (
                  <>
                    <div className={styles.fields}>
                      <label>
                        Направление
                        <select
                          value={selectedLocationId ?? ''}
                          onChange={(event) => {
                            const val = event.target.value;
                            if (!val) {
                              setSelectedLocationId(null);
                              setCityName('Все направления');
                            } else {
                              const id = Number(val);
                              setSelectedLocationId(id);
                              const found = locations.find((l) => l.id === id);
                              setCityName(found?.name_ru || found?.name || 'Выбранный город');
                            }
                          }}
                        >
                          <option value="">Все направления</option>
                          {locations.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name_ru || item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className={styles.dates}>
                        <div className={styles.dateFieldBlock}>
                          <div className={styles.dateLabelRow}>
                            <label htmlFor="checkinInput">Заезд</label>
                            {checkin && (
                              <span className={styles.dateFormatted}>{formatRuDate(checkin)}</span>
                            )}
                          </div>
                          <RuDateInput
                            id="checkinInput"
                            label="Заезд"
                            value={checkin}
                            min={getTodayIso()}
                            onChange={handleCheckinChange}
                          />
                        </div>
                        <div className={styles.dateFieldBlock}>
                          <div className={styles.dateLabelRow}>
                            <label htmlFor="checkoutInput">Выезд</label>
                            {checkout && (
                              <span className={styles.dateFormatted}>{formatRuDate(checkout)}</span>
                            )}
                          </div>
                          <RuDateInput
                            id="checkoutInput"
                            label="Выезд"
                            value={checkout}
                            min={checkin ? addDaysIso(checkin, 1) : addDaysIso(getTodayIso(), 1)}
                            onChange={handleCheckoutChange}
                          />
                        </div>
                      </div>
                      <div className={styles.guestRow}>
                        <span>Гости</span>
                        <div>
                          <button
                            type="button"
                            onClick={() => setGuests((value) => Math.max(1, value - 1))}
                            aria-label="Уменьшить число гостей"
                          >
                            −
                          </button>
                          <strong>{guests}</strong>
                          <button
                            type="button"
                            onClick={() => setGuests((value) => Math.min(12, value + 1))}
                            aria-label="Увеличить число гостей"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    {dateError && (
                      <p className={styles.error} role="alert">
                        {dateError}
                      </p>
                    )}
                    <button
                      type="button"
                      className={styles.apply}
                      onClick={handleApplyDates}
                    >
                      Применить
                    </button>
                  </>
                ) : (
                  <>
                    <p className={styles.help}>Выберите, что важно для поездки (демо-фильтр).</p>
                    <div className={styles.chips}>
                      {filterOptions.map((option) => (
                        <button
                          type="button"
                          key={option}
                          className={filters.includes(option) ? styles.selected : ''}
                          aria-pressed={filters.includes(option)}
                          onClick={() =>
                            setFilters((previous) =>
                              previous.includes(option)
                                ? previous.filter((value) => value !== option)
                                : [...previous, option]
                            )
                          }
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <button type="button" className={styles.apply} onClick={() => setSheet(null)}>
                      Готово
                    </button>
                  </>
                )}
              </section>
            </div>
          )}
        </main>
      )}
      {detailListingId && (
        <HotelDetailSheet
          listingId={detailListingId}
          onClose={() => setDetailListingId(null)}
          onBook={() => {
            setDetailListingId(null);
            setBookingOpen(true);
          }}
        />
      )}
      {bookingOpen && (
        <BookingCalendar
          checkin={checkin}
          checkout={checkout}
          onChange={(from, to) => {
            setCheckin(from);
            setCheckout(to);
          }}
          onNext={() => {
            setBookingOpen(false);
            setBookingStarted(true);
          }}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </>
  );
}
