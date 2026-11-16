import type { ReactNode } from 'react';
import type { Article, ArticleSummary } from '@/shared/contracts/reading';

type Props = {
  articles: ArticleSummary[];
  article?: Article;
  loading?: boolean;
  error?: string;
  audioUrl?: string;
  audioLoading?: boolean;
  account?: ReactNode;
  onOpen: (id: string) => void;
  onClose: () => void;
  onRetry: () => void;
  onPlay: () => void;
};

export function ReadingPanel({
  articles,
  article,
  loading,
  error,
  audioUrl,
  audioLoading,
  account,
  onOpen,
  onClose,
  onRetry,
  onPlay,
}: Props) {
  const showList = !loading && !error && !article;
  return (
    <div className="reading-workspace">
      <header className="workspace-header">
        <h1>LingoCurrent</h1>
        {account}
      </header>
      <section className="reading-panel" aria-label="Articles" aria-busy={loading}>
        {error && (
          <div role="alert">
            <p>{error}</p>
            <button onClick={onRetry}>Try again</button>
          </div>
        )}
        {loading && <p role="status">Loading your workspace…</p>}
        {showList && (
          <>
            <h2>Articles</h2>
            {articles.length === 0 ? (
              <p>No articles yet.</p>
            ) : (
              <ul className="article-list">
                {articles.map((item) => (
                  <li key={item.id}>
                    <button className="article-title" onClick={() => onOpen(item.id)}>
                      {item.title}
                    </button>
                    <p>
                      {item.source.name} · {item.category}
                    </p>
                    <p>
                      <VisitTime value={item.lastVisitedAt} />
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {!loading && article && (
          <article>
            <button onClick={onClose}>Back to articles</button>
            <p>
              {article.source.name} · {article.category}
            </p>
            <h2>{article.title}</h2>
            <p className="article-body">{article.body}</p>
            <ArticleAudio audioUrl={audioUrl} audioLoading={audioLoading} onPlay={onPlay} />
            <p>
              Collected{' '}
              <time dateTime={article.collectedAt}>
                {new Date(article.collectedAt).toLocaleDateString('en-CA')}
              </time>
            </p>
          </article>
        )}
      </section>
    </div>
  );
}

function VisitTime({ value }: { value: string | null }) {
  if (!value) return <>Not visited yet</>;
  return (
    <>
      Last visited <time dateTime={value}>{new Date(value).toLocaleString('en-CA')}</time>
    </>
  );
}

function ArticleAudio({
  audioUrl,
  audioLoading,
  onPlay,
}: Pick<Props, 'audioUrl' | 'audioLoading' | 'onPlay'>) {
  if (audioUrl) return <audio controls src={audioUrl} aria-label="Article audio" />;
  return (
    <button disabled={audioLoading} onClick={onPlay}>
      {audioLoading ? 'Loading audio…' : 'Play article'}
    </button>
  );
}
