import { ProductDetailsPage } from '@/views/marketplace/ProductDetailsPage';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function Page({ params, searchParams }: PageProps<'/products/[id]'>) {
  const { id } = await params;
  const raw = Number(first((await searchParams).participants));
  const participants = Number.isInteger(raw) && raw >= 1 && raw <= 10 ? raw : 1;
  return <ProductDetailsPage id={id} participants={participants} />;
}
