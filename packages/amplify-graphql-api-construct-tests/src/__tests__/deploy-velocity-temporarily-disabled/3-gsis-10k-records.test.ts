import {
  COUNT_10_THOUSAND,
  MUTATION_THREE_FIELD_CREATE,
  SCHEMA_THREE_FIELDS_ALL_INDEXED,
  SCHEMA_THREE_FIELDS_NO_INDEX,
} from '../deploy-velocity/deploy-velocity-constants';
import { DURATION_30_MINUTES } from '../../utils/duration-constants';
import {
  recordCountDataProvider,
  recordCountDataValidator,
  testManagedTableDeployment,
} from '../deploy-velocity/deploy-velocity-test-core';

testManagedTableDeployment({
  name: '3 GSIs updated - 10k Records',
  maxDeployDurationMs: DURATION_30_MINUTES,
  initialSchema: SCHEMA_THREE_FIELDS_NO_INDEX,
  updatedSchema: SCHEMA_THREE_FIELDS_ALL_INDEXED,
  dataSetup: recordCountDataProvider(COUNT_10_THOUSAND, MUTATION_THREE_FIELD_CREATE),
  dataValidate: recordCountDataValidator(COUNT_10_THOUSAND),
});
