export type VisitRepository = {
  visit: (
    ownerId: string,
    articleId: string,
    operationId: string,
  ) => Promise<{ lastVisitedAt: string }>;
};
export const readingService = (repository: VisitRepository) => repository;
