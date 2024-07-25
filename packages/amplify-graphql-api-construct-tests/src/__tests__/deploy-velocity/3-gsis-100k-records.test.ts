import { DURATION_45_MINUTES } from '../../utils/duration-constants';
import {
  COUNT_100_THOUSAND,
  MUTATION_THREE_FIELD_CREATE,
  SCHEMA_THREE_FIELDS_ALL_INDEXED,
  SCHEMA_THREE_FIELDS_NO_INDEX,
} from './deploy-velocity-constants';
import { recordCountDataProvider, recordCountDataValidator, testManagedTableDeployment } from './deploy-velocity-test-core';

testManagedTableDeployment({
  name: '3 GSIs updated - 100k Records',
  maxDeployDurationMs: DURATION_45_MINUTES,
  initialSchema: SCHEMA_THREE_FIELDS_NO_INDEX,
  updatedSchema: SCHEMA_THREE_FIELDS_ALL_INDEXED,
  dataSetup: recordCountDataProvider(COUNT_100_THOUSAND, MUTATION_THREE_FIELD_CREATE),
  dataValidate: recordCountDataValidator(COUNT_100_THOUSAND),
});
