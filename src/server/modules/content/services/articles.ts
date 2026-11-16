import type { Article, ArticleSummary } from '../../../../shared/contracts/reading.ts';
import { ApplicationError } from '../../../../shared/contracts/errors.ts';

export type ArticleRepository = {
  list: (ownerId: string) => Promise<ArticleSummary[]>;
  find: (ownerId: string, id: string) => Promise<Article | null>;
};
export function articleService(repository: ArticleRepository) {
  return {
    list: repository.list,
    async find(ownerId: string, id: string) {
      const article = await repository.find(ownerId, id);
      if (!article) throw new ApplicationError('NOT_FOUND', 'Article not found.', 404);
      return article;
    },
  };
}
