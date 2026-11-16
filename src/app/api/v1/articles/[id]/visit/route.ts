import { resourceId, visitInput } from '@/shared/contracts/reading';
import { apiResponse, requireSameOrigin } from '@/server/application/http';
import { workspace } from '@/server/application/workspace';

export async function PUT(request: Request, context: RouteContext<'/api/v1/articles/[id]/visit'>) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const { operationId } = visitInput.parse(await request.json());
    return workspace.visit(resourceId.parse((await context.params).id), operationId);
  });
}
