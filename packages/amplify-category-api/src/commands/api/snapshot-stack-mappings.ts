import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { snapshotStackMappings } from '../../provider-utils/awscloudformation/stack-mapping-manager';

/**
 * Pull all resolver and functions from the current cloud backend and snapshot them in the transform.conf.json file.
 * `amplify pull` may need to be run first.
 */
export const run = async (context: $TSContext): Promise<void> => snapshotStackMappings();
