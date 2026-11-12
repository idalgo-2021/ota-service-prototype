'use client';

import Link from 'next/link';
import type { Booking, CatalogLanguage } from '@/lib/api';
import { Button } from '@/shared/button';
import { ProfileThumbnail } from '@/shared/profile-thumbnail/ProfileThumbnail';
import { StatusBadge } from '@/shared/status-badge';
import styles from './BookingCard.module.css';
import { useController } from './useController';

type BookingCardProps = {
  booking: Booking;
  lang: CatalogLanguage;
  highlighted: boolean;
  onCancel: () => void;
};

export const BookingCard = ({ booking, lang, highlighted, onCancel }: BookingCardProps) => {
  const { title, dates, guests, total, status, cancellable, servicesHref } = useController(
    booking,
    lang
  );
  const listingHref = `/listings/${booking.listing_id}`;

  return (
    <tr className={highlighted ? styles.highlighted : undefined}>
      <td>
        <div className={styles.subject}>
          <ProfileThumbnail href={listingHref} label={title} src={booking.listing_thumbnail_url} />
          <Link href={listingHref} className={styles.title}>
            {title}
          </Link>
        </div>
      </td>
      <td>
        <div className={styles.details}>
          <span>{dates}</span>
          <span className={styles.muted}>{guests}</span>
          {booking.cancellation_reason && (
            <span className={styles.cancellation}>
              {lang === 'en' ? 'Cancellation' : 'Отмена'}: {booking.cancellation_reason}
            </span>
          )}
        </div>
      </td>
      <td>
        <div className={styles.details}>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <strong>{total}</strong>
        </div>
      </td>
      <td>
        <div className={styles.actions}>
          {servicesHref && (
            <Button asChild {...buttonStyle}>
              <Link href={servicesHref}>
                {lang === 'en' ? 'Tours and services' : 'Экскурсии и услуги'}
              </Link>
            </Button>
          )}
          {cancellable && (
            <Button appearance="soft" {...buttonStyle} onClick={onCancel}>
              {lang === 'en' ? 'Cancel booking' : 'Отменить бронь'}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
};

const buttonStyle = { h: '36px', borderRadius: '9px', fontSize: '13px', px: '10px' };
