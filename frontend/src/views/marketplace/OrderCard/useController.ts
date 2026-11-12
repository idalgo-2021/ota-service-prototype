import type { CatalogLanguage, Order, OrderStatus } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { StatusTone } from '@/shared/status-badge';

const STATUSES: Record<OrderStatus, { ru: string; en: string; tone: StatusTone }> = {
  pending: { ru: 'В корзине', en: 'In cart', tone: 'waiting' },
  confirmed: { ru: 'Оформлен', en: 'Confirmed', tone: 'active' },
  fulfilled: { ru: 'Выполнен', en: 'Completed', tone: 'done' },
  cancelled: { ru: 'Отменен', en: 'Cancelled', tone: 'canceled' },
};

// Неоформленный заказ через сутки закрывает сам бэкенд с этой причиной.
const EXPIRED_REASON = 'expired';

export const useController = (order: Order, lang: CatalogLanguage) => ({
  title: `${lang === 'en' ? 'Order from' : 'Заказ от'} ${new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${order.created_at.slice(0, 10)}T00:00:00`))}`,
  status: { label: STATUSES[order.status][lang], tone: STATUSES[order.status].tone },
  total: formatMoney(order.total, order.currency, lang === 'en' ? 'en-US' : 'ru-RU'),
  cancellation:
    order.cancellation_reason === EXPIRED_REASON
      ? lang === 'en'
        ? 'Not placed within a day — cart cleared.'
        : 'Не оформлен за сутки — корзина очищена.'
      : order.cancellation_reason,
});
