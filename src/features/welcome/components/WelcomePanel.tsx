type Props = {
  state?: 'ready' | 'empty' | 'loading' | 'error';
  description?: string;
};

const messages = {
  ready: 'Your English reading and practice workspace is taking shape.',
  empty: 'No articles yet.',
  loading: 'Loading your workspace…',
  error: 'The workspace could not load. Please try again.',
};

export function WelcomePanel({ state = 'ready', description }: Props) {
  return (
    <section className="welcome" aria-labelledby="welcome-title" aria-busy={state === 'loading'}>
      <h1 id="welcome-title">LingoCurrent</h1>
      <p role={state === 'error' ? 'alert' : undefined}>{description ?? messages[state]}</p>
      <p>Read. Collect vocabulary. Practice.</p>
    </section>
  );
}
