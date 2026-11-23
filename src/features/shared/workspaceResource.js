import { createContext, useContext } from 'react';
import { resources } from '../vendor/vendorData';

export const WorkspaceResourceContext = createContext({ resources, rootPath: '/vendor' });

export function useWorkspaceResource(key) {
  const config = useContext(WorkspaceResourceContext);
  const resource = config.resources[key];
  return { resource, base: `${config.rootPath}/${resource.path}`, renderActions: config.renderActions };
}
