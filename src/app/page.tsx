import { WelcomePage } from '@/features/welcome/pages/WelcomePage';
import { ReadingPage } from '@/features/reading/pages/ReadingPage';

export default function Home() {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ReadingPage /> : <WelcomePage />;
}
