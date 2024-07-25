import { DURATION_30_MINUTES } from '../../utils/duration-constants';
import {
  MUTATION_FOUR_FIELD_CREATE_STATIC,
  SCHEMA_FOUR_FIELDS_FINAL_TWO_INDEXED,
  SCHEMA_FOUR_FIELDS_INITIAL_TWO_INDEXED,
} from '../deploy-velocity/deploy-velocity-constants';
import {
  recordByIdDataValidator,
  recordProviderWithIdState,
  testManagedTableDeployment,
} from '../deploy-velocity/deploy-velocity-test-core';

testManagedTableDeployment({
  name: 'Replace 2 GSIs updated - Single Record',
  maxDeployDurationMs: DURATION_30_MINUTES,
  initialSchema: SCHEMA_FOUR_FIELDS_INITIAL_TWO_INDEXED,
  updatedSchema: SCHEMA_FOUR_FIELDS_FINAL_TWO_INDEXED,
  dataSetup: recordProviderWithIdState(MUTATION_FOUR_FIELD_CREATE_STATIC),
  dataValidate: recordByIdDataValidator(),
});
