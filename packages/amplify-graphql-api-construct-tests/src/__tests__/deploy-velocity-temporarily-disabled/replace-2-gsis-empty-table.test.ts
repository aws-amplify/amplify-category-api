import { DURATION_30_MINUTES } from '../../utils/duration-constants';
import { SCHEMA_FOUR_FIELDS_FINAL_TWO_INDEXED, SCHEMA_FOUR_FIELDS_INITIAL_TWO_INDEXED } from '../deploy-velocity/deploy-velocity-constants';
import { testManagedTableDeployment } from '../deploy-velocity/deploy-velocity-test-core';

testManagedTableDeployment({
  name: 'Replace 2 GSIs updated - Empty Table',
  maxDeployDurationMs: DURATION_30_MINUTES,
  initialSchema: SCHEMA_FOUR_FIELDS_INITIAL_TWO_INDEXED,
  updatedSchema: SCHEMA_FOUR_FIELDS_FINAL_TWO_INDEXED,
});
