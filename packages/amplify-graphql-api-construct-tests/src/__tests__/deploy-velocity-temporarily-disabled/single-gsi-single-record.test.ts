import { DURATION_10_MINUTES } from '../../utils/duration-constants';
import {
  MUTATION_ONE_FIELD_CREATE_STATIC,
  SCHEMA_ONE_FIELD_ALL_INDEXED,
  SCHEMA_ONE_FIELD_NO_INDEX,
} from '../deploy-velocity/deploy-velocity-constants';
import {
  recordByIdDataValidator,
  recordProviderWithIdState,
  testManagedTableDeployment,
} from '../deploy-velocity/deploy-velocity-test-core';

testManagedTableDeployment({
  name: 'Single GSI updated - Single Record',
  maxDeployDurationMs: DURATION_10_MINUTES,
  initialSchema: SCHEMA_ONE_FIELD_NO_INDEX,
  updatedSchema: SCHEMA_ONE_FIELD_ALL_INDEXED,
  dataSetup: recordProviderWithIdState(MUTATION_ONE_FIELD_CREATE_STATIC),
  dataValidate: recordByIdDataValidator(),
});
