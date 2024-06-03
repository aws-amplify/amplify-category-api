import {
  API_POST_PROCESSOR_SET_PROVISIONED_THROUGHPUT_TWO_GSIS,
  SCHEMA_FOUR_FIELDS_FINAL_TWO_INDEXED,
  SCHEMA_FOUR_FIELDS_INITIAL_TWO_INDEXED,
} from '../deploy-velocity/deploy-velocity-constants';
import { DURATION_30_MINUTES } from '../../utils/duration-constants';
import { testManagedTableDeployment } from '../deploy-velocity/deploy-velocity-test-core';

testManagedTableDeployment({
  name: 'Replace 2 GSIs updated w/ attr update - Empty Table',
  maxDeployDurationMs: DURATION_30_MINUTES,
  initialSchema: SCHEMA_FOUR_FIELDS_INITIAL_TWO_INDEXED,
  updatedSchema: SCHEMA_FOUR_FIELDS_FINAL_TWO_INDEXED,
  updatedApiPostProcessor: API_POST_PROCESSOR_SET_PROVISIONED_THROUGHPUT_TWO_GSIS,
});
