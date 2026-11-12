'use client';

import type { CatalogLanguage, Order } from '@/lib/api';
import { Button } from '@/shared/button';
import { ProfileLink } from '@/shared/profile-link';
import { StatusBadge } from '@/shared/status-badge';
import styles from './OrderCard.module.css';
import { OrderItemRow } from './OrderItemRow';
import { useController } from './useController';

type OrderCardProps = {
  order: Order;
  lang: CatalogLanguage;
  onCancel?: (order: Order) => void;
};

export const OrderCard = ({ order, lang, onCancel }: OrderCardProps) => {
  const { title, status, total, cancellation } = useController(order, lang);

  return (
    <tr>
      <td>
        <div className={styles.products}>
          {order.items.map((item) => (
            <OrderItemRow key={`${item.product_id}:${item.date ?? ''}`} item={item} lang={lang} />
          ))}
        </div>
      </td>
      <td>
        <div className={styles.details}>
          <strong>{title}</strong>
          {order.booking_id && (
            <span className={styles.muted}>
              {lang === 'en' ? 'Linked to booking' : 'Связан с бронью'} ·{' '}
              <ProfileLink tab="bookings">
                {lang === 'en' ? 'Open' : 'Открыть'}
              </ProfileLink>
            </span>
          )}
          {cancellation && (
            <span className={styles.cancellation}>
              {lang === 'en' ? 'Cancellation' : 'Отмена'}: {cancellation}
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
        {order.status === 'confirmed' && onCancel && (
          <Button appearance="soft" onClick={() => onCancel(order)} {...buttonStyle}>
            {lang === 'en' ? 'Cancel order' : 'Отменить заказ'}
          </Button>
        )}
      </td>
    </tr>
  );
};

const buttonStyle = { h: '36px', borderRadius: '9px', fontSize: '13px', px: '10px' };
