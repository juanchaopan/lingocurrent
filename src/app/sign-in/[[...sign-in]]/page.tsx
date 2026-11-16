import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main>
      <h1>LingoCurrent</h1>
      {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
        <SignIn />
      ) : (
        <p>Sign-in is not configured yet.</p>
      )}
    </main>
  );
}
