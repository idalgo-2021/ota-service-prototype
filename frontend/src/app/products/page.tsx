import type { ProductType } from '@/lib/api';
import { ProductsPage } from '@/views/marketplace/ProductsPage';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function Page({ searchParams }: PageProps<'/products'>) {
  const params = await searchParams;
  const raw = Number(first(params.participants));
  const participants = Number.isInteger(raw) && raw >= 1 && raw <= 10 ? raw : 1;
  const rawLocationId = Number(first(params.location_id));
  const locationId =
    Number.isSafeInteger(rawLocationId) && rawLocationId > 0 ? rawLocationId : undefined;
  const rawProductType = first(params.product_type);
  const productType = ['tour', 'service', 'goods'].includes(rawProductType ?? '')
    ? (rawProductType as ProductType)
    : undefined;

  return (
    <ProductsPage
      participants={participants}
      initialQuery={first(params.query) ?? ''}
      initialLocationId={locationId}
      initialProductType={productType}
    />
  );
}
