'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import styles from './booking.module.css';

type Room = {
  id: string;
  name: string;
  price: number;
  description: string;
  area: string;
  bed: string;
  capacity: number;
  features: string[];
  position: string;
};

const rooms: Room[] = [
  {
    id: 'standard',
    name: 'Стандарт с видом',
    price: 6800,
    description: 'Светлый номер для спокойного отдыха после прогулок по городу.',
    area: '24 м²',
    bed: 'Двуспальная кровать',
    capacity: 2,
    features: ['Wi-Fi', 'Собственная ванная', 'Кондиционер', 'Вид из окна'],
    position: '30% center',
  },
  {
    id: 'comfort',
    name: 'Комфорт',
    price: 8900,
    description: 'Просторнее, с мягкой зоной отдыха и завтраком для неспешного утра.',
    area: '32 м²',
    bed: 'Двуспальная кровать',
    capacity: 3,
    features: ['Завтрак', 'Wi-Fi', 'Собственная ванная', 'Кондиционер'],
    position: 'center',
  },
  {
    id: 'family',
    name: 'Семейный номер',
    price: 11200,
    description: 'Больше пространства, чтобы разместиться вместе и чувствовать себя как дома.',
    area: '42 м²',
    bed: 'Двуспальная кровать и диван',
    capacity: 4,
    features: ['Завтрак', 'Wi-Fi', 'Собственная ванная', 'Дополнительное спальное место'],
    position: '70% center',
  },
];

const money = (value: number) => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
const prettyDate = (value: string) =>
  new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${value}T12:00`)
  );
const nightsBetween = (from: string, to: string) =>
  Math.max(
    1,
    Math.round((new Date(`${to}T12:00`).getTime() - new Date(`${from}T12:00`).getTime()) / 86400000)
  );

type Props = {
  city: string;
  checkin: string;
  checkout: string;
  guests: number;
  onGuestsChange: (value: number) => void;
  onEditDates: () => void;
  onBackToFeed: () => void;
};

type Step = 'rooms' | 'guests' | 'payment' | 'success';

export function BookingFlow({
  city,
  checkin,
  checkout,
  guests,
  onGuestsChange,
  onEditDates,
  onBackToFeed,
}: Props) {
  const [step, setStep] = useState<Step>('rooms');
  const [room, setRoom] = useState<Room | null>(null);
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const detailCloseRef = useRef<HTMLButtonElement>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const nights = nightsBetween(checkin, checkout);
  const total = room ? room.price * nights : 0;

  useEffect(() => {
    if (!detailRoom) {
      return;
    }
    detailCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDetailRoom(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [detailRoom]);

  function changeGuests(value: number) {
    onGuestsChange(value);
    if (room && value > room.capacity) {
      setRoom(null);
      setStep('rooms');
    }
  }

  function continueWithRoom() {
    if (!room) {
      return;
    }
    setStep('guests');
  }

  function submitGuests(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep('payment');
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const card = String(data.get('card') ?? '').replace(/\s/g, '');
    const expiry = String(data.get('expiry') ?? '');
    const cvc = String(data.get('cvc') ?? '');
    if (!/^\d{16}$/.test(card) || !/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3}$/.test(cvc)) {
      setPaymentError('Введите учебный номер из 16 цифр, срок ММ/ГГ и CVC из 3 цифр.');
      return;
    }
    setCardLast4(card.slice(-4));
    setPaymentError('');
    event.currentTarget.reset();
    setStep('success');
  }

  const previous: Record<Step, Step | null> = {
    rooms: null,
    guests: 'rooms',
    payment: 'guests',
    success: null,
  };

  return (
    <div className={styles.flow}>
      <div className={styles.flowShell}>
        <header className={styles.flowHeader}>
          <button
            type="button"
            className={styles.back}
            onClick={() => (previous[step] ? setStep(previous[step]) : onBackToFeed())}
            aria-label="Назад"
          >
            ←
          </button>
          <span className={styles.flowBrand}>Бронирование</span>
          <span className={styles.demoBadge}>Демо · musya</span>
        </header>
        {step !== 'success' && (
          <ol className={styles.progress} aria-label="Этапы бронирования">
            {['Номер', 'Гости', 'Оплата'].map((label, index) => {
              const current = { rooms: 0, guests: 1, payment: 2 }[step];
              return (
                <li
                  key={label}
                  className={
                    index === current
                      ? styles.progressCurrent
                      : index < current
                        ? styles.progressDone
                        : ''
                  }
                  aria-current={index === current ? 'step' : undefined}
                >
                  <span>{index + 1}</span>
                  <small>{label}</small>
                </li>
              );
            })}
          </ol>
        )}
        {step !== 'success' && (
          <div className={styles.tripBar}>
            <div className={styles.tripBarInner}>
              <span>Ваше путешествие</span>
              <strong>{city}</strong>
            </div>
            <button type="button" className={styles.tripDates} onClick={onEditDates}>
              {prettyDate(checkin)} — {prettyDate(checkout)} <span>Изменить</span>
            </button>
            <div className={styles.flowGuests}>
              <span>Гости</span>
              <div>
                <button
                  type="button"
                  onClick={() => changeGuests(Math.max(1, guests - 1))}
                  aria-label="Уменьшить число гостей"
                >
                  −
                </button>
                <strong>{guests}</strong>
                <button
                  type="button"
                  onClick={() => changeGuests(Math.min(4, guests + 1))}
                  aria-label="Увеличить число гостей"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}
        {step === 'rooms' && (
          <section className={styles.flowContent}>
            <h1>Выберите номер</h1>
            <p className={styles.lead}>
              Свободные варианты на {nights} {nights === 1 ? 'ночь' : 'ночи'} для {guests} гост.
            </p>
            <div className={styles.roomList}>
              {rooms
                .filter((item) => item.capacity >= guests)
                .map((item) => (
                  <article
                    className={`${styles.roomCard} ${room?.id === item.id ? styles.roomCardSelected : ''}`}
                    key={item.id}
                  >
                    <div className={styles.roomPhoto}>
                      <Image
                        src="/articles/hotels.jpg"
                        alt={`Номер ${item.name}`}
                        fill
                        sizes="(max-width: 700px) 100vw, 360px"
                        style={{ objectFit: 'cover', objectPosition: item.position }}
                      />
                    </div>
                    <div className={styles.roomBody}>
                      <div>
                        <div className={styles.roomTopline}>
                          <span>Musya · отель</span>
                          <span>{item.area}</span>
                        </div>
                        <h2>{item.name}</h2>
                        <p>{item.description}</p>
                        <span className={styles.roomMeta}>
                          {item.bed} · До {item.capacity} гостей
                        </span>
                      </div>
                      <div className={styles.roomBottom}>
                        <div>
                          <strong>{money(item.price * nights)}</strong>
                          <small>
                            за {nights} ноч. · {money(item.price)} за ночь
                          </small>
                        </div>
                        <div className={styles.roomControls}>
                          <button
                            type="button"
                            className={styles.detailsButton}
                            onClick={() => setDetailRoom(item)}
                          >
                            Детали
                          </button>
                          <button
                            type="button"
                            className={styles.selectButton}
                            onClick={() => setRoom(item)}
                            aria-pressed={room?.id === item.id}
                            aria-label={`${room?.id === item.id ? 'Выбран' : 'Выбрать'} номер ${item.name}`}
                          >
                            <span className={styles.radioMark} />
                            {room?.id === item.id ? 'Выбран' : 'Выбрать'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        )}
        {step === 'rooms' && (
          <div className={styles.selectionFooter}>
            <div className={styles.selectionInner}>
              <div>
                <span>{room ? room.name : 'Выберите номер'}</span>
                <strong>{room ? money(total) : '—'}</strong>
              </div>
              <button
                type="button"
                className={styles.primary}
                disabled={!room}
                onClick={continueWithRoom}
              >
                Дальше →
              </button>
            </div>
          </div>
        )}
        {step === 'guests' && (
          <section className={styles.narrowContent}>
            <h1>Кто заселяется?</h1>
            <p className={styles.lead}>Заполните контактные данные для учебного бронирования.</p>
            <form className={styles.form} onSubmit={submitGuests}>
              <label>
                Имя и фамилия
                <input
                  required
                  minLength={2}
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Анна Иванова"
                  autoComplete="name"
                />
              </label>
              <label>
                Электронная почта
                <input
                  required
                  type="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  placeholder="anna@example.com"
                  autoComplete="email"
                />
              </label>
              <label>
                Телефон
                <input
                  required
                  type="tel"
                  value={guestPhone}
                  onChange={(event) => setGuestPhone(event.target.value)}
                  placeholder="+7 999 123-45-67"
                  autoComplete="tel"
                />
              </label>
              <button type="submit" className={styles.primary}>
                Дальше →
              </button>
            </form>
          </section>
        )}
        {step === 'payment' && room && (
          <section className={styles.narrowContent}>
            <h1>Учебная оплата</h1>
            <p className={styles.lead}>
              Поля уже заполнены тестовой картой. Это демонстрация: данные никуда не отправляются,
              реальной оплаты не будет.
            </p>
            <div className={styles.orderSummary}>
              <h2>Ваш заказ</h2>
              <dl>
                <div>
                  <dt>Город</dt>
                  <dd>{city}</dd>
                </div>
                <div>
                  <dt>Даты</dt>
                  <dd>
                    {prettyDate(checkin)} — {prettyDate(checkout)}
                  </dd>
                </div>
                <div>
                  <dt>Номер</dt>
                  <dd>{room.name}</dd>
                </div>
                <div>
                  <dt>Гости</dt>
                  <dd>{guests}</dd>
                </div>
                <div>
                  <dt>Итого</dt>
                  <dd>{money(total)}</dd>
                </div>
              </dl>
            </div>
            <form className={styles.form} onSubmit={submitPayment} autoComplete="off">
              <label>
                Учебный номер карты
                <input
                  required
                  name="card"
                  inputMode="numeric"
                  defaultValue="4242 4242 4242 4242"
                  maxLength={19}
                />
              </label>
              <div className={styles.twoFields}>
                <label>
                  Срок
                  <input required name="expiry" defaultValue="12/30" maxLength={5} />
                </label>
                <label>
                  CVC
                  <input
                    required
                    name="cvc"
                    inputMode="numeric"
                    defaultValue="123"
                    maxLength={3}
                    type="password"
                  />
                </label>
              </div>
              {paymentError && (
                <p role="alert" className={styles.error}>
                  {paymentError}
                </p>
              )}
              <button type="submit" className={styles.primary}>
                Завершить учебное бронирование
              </button>
            </form>
          </section>
        )}
        {step === 'success' && room && (
          <section className={styles.narrowContent}>
            <div className={styles.successIcon}>✓</div>
            <h1>Данные заполнены</h1>
            <p className={styles.lead}>
              Учебное бронирование завершено. Реальная бронь и оплата не создавались.
            </p>
            <div className={styles.orderSummary}>
              <h2>Проверьте детали</h2>
              <dl>
                <div>
                  <dt>Город</dt>
                  <dd>{city}</dd>
                </div>
                <div>
                  <dt>Отель</dt>
                  <dd>Musya · демонстрационный отель</dd>
                </div>
                <div>
                  <dt>Номер</dt>
                  <dd>{room.name}</dd>
                </div>
                <div>
                  <dt>Заезд</dt>
                  <dd>{prettyDate(checkin)}</dd>
                </div>
                <div>
                  <dt>Выезд</dt>
                  <dd>{prettyDate(checkout)}</dd>
                </div>
                <div>
                  <dt>Гости</dt>
                  <dd>{guests}</dd>
                </div>
                <div>
                  <dt>Имя</dt>
                  <dd>{guestName}</dd>
                </div>
                <div>
                  <dt>Почта</dt>
                  <dd>{guestEmail}</dd>
                </div>
                <div>
                  <dt>Телефон</dt>
                  <dd>{guestPhone}</dd>
                </div>
                <div>
                  <dt>Карта</dt>
                  <dd>•••• {cardLast4}</dd>
                </div>
                <div>
                  <dt>Сумма</dt>
                  <dd>{money(total)}</dd>
                </div>
              </dl>
            </div>
            <button type="button" className={styles.primary} onClick={onBackToFeed}>
              Вернуться к видео
            </button>
          </section>
        )}
      </div>
      {detailRoom && (
        <div
          className={styles.detailBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDetailRoom(null);
            }
          }}
        >
          <section
            className={styles.detailSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="roomDetailTitle"
          >
            <div className={styles.handle} />
            <div className={styles.detailSheetHead}>
              <h2 id="roomDetailTitle">{detailRoom.name}</h2>
              <button
                type="button"
                className={styles.close}
                ref={detailCloseRef}
                onClick={() => setDetailRoom(null)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <div className={styles.detailPhoto}>
              <Image
                src="/articles/hotels.jpg"
                alt={`Номер ${detailRoom.name}`}
                fill
                sizes="(max-width: 700px) 100vw, 600px"
                style={{ objectFit: 'cover', objectPosition: detailRoom.position }}
              />
            </div>
            <p className={styles.lead}>{detailRoom.description}</p>
            <div className={styles.detailFacts}>
              <div>
                <span>Заезд</span>
                <strong>{prettyDate(checkin)}</strong>
              </div>
              <div>
                <span>Выезд</span>
                <strong>{prettyDate(checkout)}</strong>
              </div>
              <div>
                <span>Площадь</span>
                <strong>{detailRoom.area}</strong>
              </div>
              <div>
                <span>Спальные места</span>
                <strong>{detailRoom.bed}</strong>
              </div>
              <div>
                <span>Гостей</span>
                <strong>До {detailRoom.capacity}</strong>
              </div>
            </div>
            <h3 className={styles.subheading}>В номере</h3>
            <ul className={styles.featureList}>
              {detailRoom.features.map((feature) => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>
            <div className={styles.detailBottom}>
              <strong>
                {money(detailRoom.price * nights)} <small>за {nights} ноч.</small>
              </strong>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  setRoom(detailRoom);
                  setDetailRoom(null);
                }}
              >
                Выбрать номер
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
