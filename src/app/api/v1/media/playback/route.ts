import { playbackInput } from '@/shared/contracts/reading';
import { apiResponse, requireSameOrigin } from '@/server/application/http';
import { workspace } from '@/server/application/workspace';

export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const input = playbackInput.parse(await request.json());
    return workspace.play(input.articleId);
  });
}
