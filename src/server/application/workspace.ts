import 'server-only';
import { workspaceDependencies } from '../infrastructure/bootstrap';
import { createWorkspace } from './workspace-core';

export const workspace = createWorkspace(workspaceDependencies);
