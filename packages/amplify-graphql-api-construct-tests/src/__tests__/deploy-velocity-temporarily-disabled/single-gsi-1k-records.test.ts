import {
  COUNT_1_THOUSAND,
  MUTATION_ONE_FIELD_CREATE,
  SCHEMA_ONE_FIELD_ALL_INDEXED,
  SCHEMA_ONE_FIELD_NO_INDEX,
} from '../deploy-velocity/deploy-velocity-constants';
import { DURATION_10_MINUTES } from '../../utils/duration-constants';
import {
  recordCountDataProvider,
  recordCountDataValidator,
  testManagedTableDeployment,
} from '../deploy-velocity/deploy-velocity-test-core';

testManagedTableDeployment({
  name: 'Single GSI updated - 1k Records',
  maxDeployDurationMs: DURATION_10_MINUTES,
  initialSchema: SCHEMA_ONE_FIELD_NO_INDEX,
  updatedSchema: SCHEMA_ONE_FIELD_ALL_INDEXED,
  dataSetup: recordCountDataProvider(COUNT_1_THOUSAND, MUTATION_ONE_FIELD_CREATE),
  dataValidate: recordCountDataValidator(COUNT_1_THOUSAND),
});
