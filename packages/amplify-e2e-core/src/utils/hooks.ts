import * as path from 'path';

/**
 *
 * @param projRoot
 */
export const getHooksDirPath = (projRoot: string): string => path.join(projRoot, 'amplify', 'hooks');
