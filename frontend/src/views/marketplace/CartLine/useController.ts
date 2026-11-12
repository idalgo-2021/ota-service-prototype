import { useGetProductQuery } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import { formatTourDate } from '../products';
import { MAX_QUANTITY, type CartItem, type CartItemKey } from '../useCart';

export const useController = (
  item: CartItem,
  onQuantityChange: (item: CartItemKey, quantity: number) => void
) => {
  const { lang } = useCatalogLanguage();
  // Карточка нужна даже при наличии снимка цены и названия: из неё берём актуальную
  // миниатюру и вид продукта для ссылки из корзины.
  const product = useGetProductQuery({ id: item.product_id, lang });

  // Цену строки считаем по цене продукта: в позициях заказа бэкенд её пока не отдаёт.
  const unitPrice = item.price ?? product.data?.price;
  const currency = item.currency ?? product.data?.currency;
  const price =
    unitPrice && currency ? formatMoney(Number(unitPrice) * item.quantity, currency) : undefined;

  const snapshotName =
    lang === 'ru' ? item.product_name_ru || item.product_name : item.product_name;

  return {
    // Снятый с продажи продукт бэкенд не отдаёт — его название уже не узнать.
    name:
      snapshotName ?? product.data?.name ?? (product.isError ? 'Предложение снято с продажи' : '…'),
    date: item.date ? formatTourDate(item.date) : undefined,
    thumbnail: product.data?.thumbnail?.url,
    productHref: `/products/${encodeURIComponent(item.product_id)}?participants=${
      product.data?.product_type === 'goods' ? 1 : item.quantity
    }`,
    price,
    canIncrease: item.quantity < MAX_QUANTITY,
    handleDecrease: () => onQuantityChange(item, item.quantity - 1),
    handleIncrease: () => onQuantityChange(item, item.quantity + 1),
    handleRemove: () => onQuantityChange(item, 0),
  };
};
