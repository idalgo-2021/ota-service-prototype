import { ArticlePage } from '@/views/main/ArticlePage';

export default async function Page({ params }: PageProps<'/articles/[slug]'>) {
  const { slug } = await params;
  return <ArticlePage slug={slug} />;
}
