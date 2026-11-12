'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import styles from './booking.module.css';

type Props = {
  checkin: string;
  checkout: string;
  onChange: (checkin: string, checkout: string) => void;
  onNext: () => void;
  onClose: () => void;
};

const toIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const occupied = (date: Date) => date.getDate() % 7 === 0 || date.getDate() % 11 === 0;
const rangeIsAvailable = (from: string, to: string, today: Date) => {
  if (!from || !to || from < toIso(today) || to <= from) {
    return false;
  }
  const end = new Date(`${to}T12:00`);
  for (const night = new Date(`${from}T12:00`); night < end; night.setDate(night.getDate() + 1)) {
    if (occupied(night)) {
      return false;
    }
  }
  return true;
};
const monthTitle = (date: Date) =>
  new Intl.DateTimeFormat('ru', { month: 'long', year: 'numeric' }).format(date);
const shortDate = (value: string) =>
  value
    ? new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' }).format(
        new Date(`${value}T12:00`)
      )
    : 'Выбрать';

export function BookingCalendar({ checkin, checkout, onChange, onNext, onClose }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const initialDate = checkin && checkin >= toIso(today) ? new Date(`${checkin}T12:00`) : today;
  const initialOffset =
    (initialDate.getFullYear() - today.getFullYear()) * 12 +
    initialDate.getMonth() -
    today.getMonth();
  const [firstOffset, setFirstOffset] = useState(initialOffset - 2);
  const [lastOffset, setLastOffset] = useState(initialOffset + 5);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prependHeightRef = useRef<number | null>(null);
  const [error, setError] = useState('');
  const months = Array.from({ length: lastOffset - firstOffset + 1 }, (_, index) => {
    const offset = firstOffset + index;
    return { offset, date: new Date(today.getFullYear(), today.getMonth() + offset, 1) };
  });
  const selectedRangeHasBusy =
    Boolean(checkin && checkout) && !rangeIsAvailable(checkin, checkout, today);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const target = scroller?.querySelector<HTMLElement>(`[data-month-offset="${initialOffset}"]`);
    if (scroller && target) {
      scroller.scrollTop =
        target.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop;
    }
    // The initial position is chosen only when the calendar opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (scroller && prependHeightRef.current !== null) {
      scroller.scrollTop += scroller.scrollHeight - prependHeightRef.current;
      prependHeightRef.current = null;
    }
  }, [firstOffset]);

  function loadMonthsOnScroll() {
    const scroller = scrollRef.current;
    if (!scroller || prependHeightRef.current !== null) {
      return;
    }
    if (scroller.scrollTop < 240) {
      prependHeightRef.current = scroller.scrollHeight;
      setFirstOffset((offset) => offset - 6);
    } else if (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 480) {
      setLastOffset((offset) => offset + 8);
    }
  }

  function choose(day: Date) {
    const value = toIso(day);
    setError('');
    if (!checkin || checkout || value <= checkin) {
      onChange(value, '');
      return;
    }
    if (!rangeIsAvailable(checkin, value, today)) {
      setError('Между заездом и выездом есть занятая ночь. Выберите другую дату выезда.');
      return;
    }
    onChange(checkin, value);
  }

  return (
    <div
      className={styles.calendarBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className={styles.calendarSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendarTitle"
      >
        <div className={styles.handle} />
        <div className={styles.calendarHead}>
          <div>
            <h2 id="calendarTitle">Даты поездки</h2>
            <p aria-live="polite">
              {!checkin
                ? 'Выберите день заезда'
                : !checkout
                  ? 'Теперь выберите день выезда'
                  : 'Даты выбраны. Можно продолжить.'}
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <div className={styles.calendarScroll} ref={scrollRef} onScroll={loadMonthsOnScroll}>
          {months.map(({ offset, date: month }) => {
            const firstWeekday = (month.getDay() + 6) % 7;
            const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
            const cells = Array.from({ length: firstWeekday + days }, (_, index) =>
              index < firstWeekday
                ? null
                : new Date(month.getFullYear(), month.getMonth(), index - firstWeekday + 1)
            );
            return (
              <section className={styles.calendarMonth} data-month-offset={offset} key={offset}>
                <h3>{monthTitle(month)}</h3>
                <div className={styles.weekdays}>
                  {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className={styles.calendarGrid}>
                  {cells.map((day, index) => {
                    if (!day) {
                      return <span key={`blank-${index}`} />;
                    }
                    const value = toIso(day);
                    const isBusy = occupied(day);
                    const canCheckOut =
                      isBusy &&
                      checkin &&
                      !checkout &&
                      value > checkin &&
                      rangeIsAvailable(checkin, value, today);
                    return (
                      <button
                        type="button"
                        key={value}
                        disabled={day < today || (isBusy && !canCheckOut)}
                        aria-label={`${day.getDate()} ${monthTitle(day)}: ${canCheckOut ? 'можно выехать' : isBusy ? 'занято' : 'свободно'}`}
                        aria-pressed={value === checkin || value === checkout}
                        className={`${value === checkin || value === checkout ? styles.chosen : ''} ${checkin && checkout && value > checkin && value < checkout ? styles.inRange : ''}`}
                        onClick={() => choose(day)}
                      >
                        <span>{day.getDate()}</span>
                        {day >= today && <i className={isBusy ? styles.busyDot : styles.freeDot} />}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
          <div className={styles.legend}>
            <span>
              <i className={styles.freeDot} />
              Свободно
            </span>
            <span>
              <i className={styles.busyDot} />
              Занято
            </span>
          </div>
          <p className={styles.demoNote}>
            Красный день подходит для выезда, если предыдущая ночь свободна. Доступность показана
            для демонстрации.
          </p>
        </div>
        <div className={styles.calendarFooter}>
          <div className={styles.dateSummary}>
            <span>
              Заезд <strong>{shortDate(checkin)}</strong>
            </span>
            <span>
              Выезд <strong>{shortDate(checkout)}</strong>
            </span>
          </div>
          {(error || selectedRangeHasBusy) && (
            <p role="alert" className={styles.error}>
              {error || 'В выбранном промежутке есть занятые ночи. Выберите другие даты.'}
            </p>
          )}
          <button
            type="button"
            className={styles.primary}
            disabled={!checkin || !checkout || selectedRangeHasBusy}
            onClick={onNext}
          >
            Дальше →
          </button>
        </div>
      </section>
    </div>
  );
}
