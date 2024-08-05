import { DURATION_10_MINUTES } from '../../utils/duration-constants';
import {
  COUNT_100_THOUSAND,
  MUTATION_ONE_FIELD_CREATE,
  SCHEMA_ONE_FIELD_ALL_INDEXED,
  SCHEMA_ONE_FIELD_NO_INDEX,
} from './deploy-velocity-constants';
import { recordCountDataProvider, recordCountDataValidator, testManagedTableDeployment } from './deploy-velocity-test-core';

testManagedTableDeployment({
  name: 'Single GSI updated - 100k Records',
  maxDeployDurationMs: DURATION_10_MINUTES,
  initialSchema: SCHEMA_ONE_FIELD_NO_INDEX,
  updatedSchema: SCHEMA_ONE_FIELD_ALL_INDEXED,
  dataSetup: recordCountDataProvider(COUNT_100_THOUSAND, MUTATION_ONE_FIELD_CREATE),
  dataValidate: recordCountDataValidator(COUNT_100_THOUSAND),
});
