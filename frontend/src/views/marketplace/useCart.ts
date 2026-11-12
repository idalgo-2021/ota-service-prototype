import { skipToken, type FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { useRef, useState } from 'react';
import {
  getErrorMessage,
  useCancelMyOrderMutation,
  useConfirmOrderMutation,
  useCreateOrderMutation,
  useGetMyOrdersQuery,
  useLinkOrderBookingMutation,
  useUpdateOrderMutation,
  type OrderItemInput,
  type OrderItem,
} from '@/lib/api';
import { useAppSelector } from '@/lib/hooks';

export const MAX_QUANTITY = 10;

export type CartItem = OrderItemInput &
  Partial<Pick<OrderItem, 'product_name' | 'product_name_ru' | 'price' | 'currency'>>;

/** Позиция без количества: продукт и, для экскурсии, дата. */
export type CartItemKey = Omit<CartItem, 'quantity'>;

/** Одна и та же экскурсия на разные даты — разные позиции. */
const isSameItem = (a: CartItemKey, b: CartItemKey) =>
  a.product_id === b.product_id && a.date === b.date;

const toOrderItems = (items: CartItem[]): OrderItemInput[] =>
  items.map(({ product_id, quantity, date }) => ({
    product_id,
    quantity,
    ...(date ? { date } : {}),
  }));

// Бэкенд пишет ошибки по-английски для разработчиков, поэтому объясняем по коду ответа.
const getCartError = (error: unknown) => {
  const status = (error as FetchBaseQueryError | undefined)?.status;
  if (status === 401) {
    return 'Сессия закончилась. Войдите снова, чтобы заказать.';
  }
  if (status === 409) {
    return 'Пока вы выбирали, цены изменились. Проверьте сумму и оформите заказ еще раз.';
  }
  if (status === 400 && getErrorMessage(error)?.includes('schedule')) {
    return 'На эту дату экскурсии нет. Выберите другую.';
  }
  if (
    status === 400 &&
    ['booking', 'location', 'service date'].some((part) => getErrorMessage(error)?.includes(part))
  ) {
    return 'Не все позиции подходят к этой поездке. Проверьте локацию и даты экскурсии.';
  }
  return 'Не удалось обновить корзину. Попробуйте еще раз.';
};

/**
 * Корзина витрины. Хранится на сервере как неоформленный заказ: первое добавление создаёт
 * его, следующие заменяют позиции целиком, а когда убрали последнюю позицию — заказ
 * отменяется, потому что пустым он быть не может. «Оформить» подтверждает заказ.
 *
 * Изменения видны сразу (оптимистично), а на сервер уходят по одному запросу за раз:
 * пока идёт запрос, копится только последнее желаемое состояние корзины. Так быстрые
 * нажатия не создают второй заказ и старый ответ не затирает новый. При ошибке корзина
 * возвращается к тому, что лежит на сервере.
 */
export const useCart = () => {
  const isSignedIn = useAppSelector((state) => !!state.auth.accessToken);
  const authRestored = useAppSelector((state) => state.auth.restored);

  const orders = useGetMyOrdersQuery(
    isSignedIn ? { limit: 1, offset: 0, status: 'pending' } : skipToken
  );
  const [createOrder] = useCreateOrderMutation();
  const [updateOrder] = useUpdateOrderMutation();
  const [confirmOrder, confirmState] = useConfirmOrderMutation();
  const [linkBooking] = useLinkOrderBookingMutation();
  const [cancelOrder] = useCancelMyOrderMutation();

  const [error, setError] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  // Корзина, какой её видит гость, пока изменения сохраняются.
  const [draft, setDraft] = useState<CartItem[] | null>(null);
  const [syncing, setSyncing] = useState(false);
  // Состояние в ref, а не в state: очередь читает его между запросами, не дожидаясь рендера.
  const syncingRef = useRef(false);
  const queuedRef = useRef<CartItem[] | null>(null);

  const order = isSignedIn
    ? orders.data?.items.find(({ status }) => status === 'pending')
    : undefined;
  const serverItems: CartItem[] = order?.items ?? [];

  const items = draft ?? serverItems;

  // Отправляет корзину и, пока шли запросы, всё, что успели поменять ещё, — по одному
  // запросу за раз. Номер заказа ведём сами: созданный заказ появится в списке не сразу.
  const sync = async (first: CartItem[]) => {
    syncingRef.current = true;
    setSyncing(true);
    let orderId = order?.id;
    let next: CartItem[] | null = first;
    try {
      do {
        while (next) {
          queuedRef.current = null;
          if (!orderId) {
            if (next.length) {
              orderId = (await createOrder({ items: toOrderItems(next) }).unwrap()).id;
            }
          } else if (next.length) {
            await updateOrder({ id: orderId, items: toOrderItems(next) }).unwrap();
          } else {
            await cancelOrder({ id: orderId, reason: '' }).unwrap();
            orderId = undefined;
          }
          next = queuedRef.current;
        }
        // Пока перечитывали серверную корзину, пользователь мог нажать кнопку ещё раз.
        await orders.refetch();
        next = queuedRef.current;
      } while (next);
      setDraft(null);
    } catch (err) {
      setError(getCartError(err));
      queuedRef.current = null;
      setDraft(null);
      await orders.refetch();
    }
    syncingRef.current = false;
    setSyncing(false);
  };

  const save = (next: CartItem[]) => {
    setError(null);
    setConfirmedId(null);
    setDraft(next);
    if (syncingRef.current) {
      queuedRef.current = next;
    } else {
      sync(next);
    }
  };

  /** Ставит количество позиции: новую добавляет, при нуле — убирает из корзины. */
  const handleQuantityChange = (target: CartItemKey, quantity: number) => {
    const next = Math.min(quantity, MAX_QUANTITY);
    const exists = items.some((current) => isSameItem(current, target));
    if (next <= 0) {
      save(items.filter((current) => !isSameItem(current, target)));
    } else if (exists) {
      save(
        items.map((current) =>
          isSameItem(current, target) ? { ...current, quantity: next } : current
        )
      );
    } else {
      save([...items, { ...target, quantity: next }]);
    }
  };

  /** Оформляет корзину; возвращает, получилось ли. Пустую корзину оформлять нечего. */
  const handleCheckout = async (bookingId?: string) => {
    if (!order || syncingRef.current) {
      return false;
    }
    setError(null);
    try {
      // Связь информационная: выбранная бронь записывается, пустой выбор очищает её.
      await linkBooking({ id: order.id, bookingId: bookingId ?? null }).unwrap();
      await confirmOrder(order.id).unwrap();
      setConfirmedId(order.id);
      return true;
    } catch (err) {
      setError(getCartError(err));
      // Цены могли измениться — перечитываем корзину, чтобы показать новый итог.
      orders.refetch();
      return false;
    }
  };

  /** Сколько штук позиции уже в корзине; экскурсия считается по выбранной дате. */
  const getQuantity = (target: CartItemKey) =>
    items.find((current) => isSameItem(current, target))?.quantity ?? 0;

  const loading = isSignedIn && orders.isLoading;

  return {
    isSignedIn,
    authRestored,
    loading,
    items,
    // Итог считает сервер, поэтому пока изменения сохраняются, его не показываем.
    total: syncing ? undefined : order?.total,
    currency: order?.currency,
    bookingId: order?.booking_id ?? undefined,
    syncing,
    // Менять корзину нельзя, пока не узнали, есть ли уже заказ, и пока он оформляется.
    locked: loading || confirmState.isLoading,
    checkoutPending: confirmState.isLoading,
    error,
    confirmedId,
    getQuantity,
    handleQuantityChange,
    handleCheckout,
  };
};

export type Cart = ReturnType<typeof useCart>;
