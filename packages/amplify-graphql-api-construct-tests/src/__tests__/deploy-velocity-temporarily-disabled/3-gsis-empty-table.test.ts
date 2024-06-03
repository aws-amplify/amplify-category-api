import { SCHEMA_THREE_FIELDS_ALL_INDEXED, SCHEMA_THREE_FIELDS_NO_INDEX } from '../deploy-velocity/deploy-velocity-constants';
import { DURATION_30_MINUTES } from '../../utils/duration-constants';
import { testManagedTableDeployment } from '../deploy-velocity/deploy-velocity-test-core';

testManagedTableDeployment({
  name: '3 GSIs updated - Empty Table',
  maxDeployDurationMs: DURATION_30_MINUTES,
  initialSchema: SCHEMA_THREE_FIELDS_NO_INDEX,
  updatedSchema: SCHEMA_THREE_FIELDS_ALL_INDEXED,
});
