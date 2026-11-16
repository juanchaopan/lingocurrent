import { resourceId } from '@/shared/contracts/reading';
import { apiResponse } from '@/server/application/http';
import { workspace } from '@/server/application/workspace';

export async function GET(_request: Request, context: RouteContext<'/api/v1/articles/[id]'>) {
  return apiResponse(async () => workspace.article(resourceId.parse((await context.params).id)));
}
