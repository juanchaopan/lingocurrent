import { notFound } from 'next/navigation';
import { ReadingPage } from '@/features/reading/pages/ReadingPage';
import { resourceId } from '@/shared/contracts/reading';
import { WelcomePage } from '@/features/welcome/pages/WelcomePage';

export default async function ArticlePage({ params }: PageProps<'/articles/[id]'>) {
  const parsed = resourceId.safeParse((await params).id);
  if (!parsed.success) notFound();
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <WelcomePage />;
  return <ReadingPage articleId={parsed.data} />;
}
