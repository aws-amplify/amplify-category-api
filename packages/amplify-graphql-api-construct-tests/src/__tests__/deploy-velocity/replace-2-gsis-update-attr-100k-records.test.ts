import {
  API_POST_PROCESSOR_SET_PROVISIONED_THROUGHPUT_TWO_GSIS,
  COUNT_100_THOUSAND,
  DURATION_45_MINUTES,
  MUTATION_FOUR_FIELD_CREATE,
  SCHEMA_FOUR_FIELDS_FINAL_TWO_INDEXED,
  SCHEMA_FOUR_FIELDS_INITIAL_TWO_INDEXED,
} from './deploy-velocity-constants';
import { recordCountDataProvider, recordCountDataValidator, testManagedTableDeployment } from './deploy-velocity-test-core';

testManagedTableDeployment({
  name: 'Replace 2 GSIs updated w/ attr update - 100k Records',
  maxDeployDurationMs: DURATION_45_MINUTES,
  initialSchema: SCHEMA_FOUR_FIELDS_INITIAL_TWO_INDEXED,
  updatedSchema: SCHEMA_FOUR_FIELDS_FINAL_TWO_INDEXED,
  dataSetup: recordCountDataProvider(COUNT_100_THOUSAND, MUTATION_FOUR_FIELD_CREATE),
  dataValidate: recordCountDataValidator(COUNT_100_THOUSAND),
  updatedApiPostProcessor: API_POST_PROCESSOR_SET_PROVISIONED_THROUGHPUT_TWO_GSIS,
});
