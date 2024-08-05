import { DURATION_10_MINUTES } from '../../utils/duration-constants';
import { SCHEMA_ONE_FIELD_ALL_INDEXED, SCHEMA_ONE_FIELD_NO_INDEX } from '../deploy-velocity/deploy-velocity-constants';
import { testManagedTableDeployment } from '../deploy-velocity/deploy-velocity-test-core';

testManagedTableDeployment({
  name: 'Single GSI updated - Empty Table',
  maxDeployDurationMs: DURATION_10_MINUTES,
  initialSchema: SCHEMA_ONE_FIELD_NO_INDEX,
  updatedSchema: SCHEMA_ONE_FIELD_ALL_INDEXED,
});
