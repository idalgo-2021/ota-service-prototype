import type { Guests, ListingUnit, UnitType } from '@/lib/api';
import { formatCount } from '@/lib/format';

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  property: 'Целиком',
  room: 'Номер',
  bed: 'Место в комнате',
};

// Нехватку мест подставляем после «на», поэтому формы — винительного падежа: «на 1 ребёнка».
const formatAdults = (count: number) => formatCount(count, ['взрослого', 'взрослых', 'взрослых']);
const formatChildren = (count: number) => formatCount(count, ['ребенка', 'детей', 'детей']);

/** Вместимость словами: «до 2 взрослых и 1 ребёнка» — в родительном падеже после «до». */
export const formatCapacity = ({ capacity_adults, capacity_children }: ListingUnit) => {
  const adults = `до ${capacity_adults} ${capacity_adults === 1 ? 'взрослого' : 'взрослых'}`;
  if (!capacity_children) {
    return adults;
  }
  const children = capacity_children === 1 ? 'ребенка' : 'детей';
  return `${adults} и ${capacity_children} ${children}`;
};

/**
 * Сколько гостей ещё не помещается в выбранные единицы. Взрослые и детские места бэкенд
 * считает раздельно: ребёнка нельзя посадить на свободное взрослое место.
 */
export const getShortage = (units: ListingUnit[], guests: Guests) => {
  const adults = units.reduce((sum, unit) => sum + unit.capacity_adults, 0);
  const children = units.reduce((sum, unit) => sum + unit.capacity_children, 0);
  return {
    adults: Math.max(guests.adults - adults, 0),
    children: Math.max(guests.children - children, 0),
  };
};

export const formatShortage = ({ adults, children }: { adults: number; children: number }) =>
  [adults ? formatAdults(adults) : null, children ? formatChildren(children) : null]
    .filter(Boolean)
    .join(' и ');
