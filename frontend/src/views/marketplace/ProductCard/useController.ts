import { useState, type ChangeEvent } from 'react';
import type { Product } from '@/lib/api';
import {
  formatTourSchedule,
  getProductFacts,
  getTourDates,
  getTypeLabel,
  type TripDates,
} from '../products';
import type { CartItemKey } from '../useCart';

export const useController = (
  product: Product,
  trip: TripDates | undefined,
  getQuantity: (item: CartItemKey) => number,
  onQuantityChange: (item: CartItemKey, quantity: number) => void
) => {
  // Экскурсия без расписания идёт без даты: её согласуют после заказа.
  const scheduled = product.product_type === 'tour' && !!product.schedule?.length;
  const dates = scheduled ? getTourDates(product.schedule ?? [], trip) : [];
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const date = dates.some(({ value }) => value === selectedDate) ? selectedDate : dates[0]?.value;

  // Экскурсия на другую дату — отдельная позиция, поэтому счётчик показывает выбранную дату.
  const item: CartItemKey = {
    product_id: product.id,
    ...(scheduled && date ? { date } : {}),
  };

  const handleDateChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedDate(event.target.value);
  };

  const handleQuantityChange = (quantity: number) => {
    onQuantityChange(item, quantity);
  };

  return {
    typeLabel: getTypeLabel(product),
    facts: getProductFacts(product),
    scheduled,
    scheduleText: scheduled ? formatTourSchedule(product.schedule ?? []) : undefined,
    dates,
    date,
    quantity: getQuantity(item),
    // По расписанию в нужные дни экскурсий нет — добавить нечего.
    unavailable: scheduled && !dates.length,
    unscheduledTour: product.product_type === 'tour' && !scheduled,
    handleDateChange,
    handleQuantityChange,
  };
};
