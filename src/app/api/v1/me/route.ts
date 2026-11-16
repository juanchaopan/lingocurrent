import { apiResponse } from '@/server/application/http';
import { workspace } from '@/server/application/workspace';

export const GET = () => apiResponse(() => workspace.me());
