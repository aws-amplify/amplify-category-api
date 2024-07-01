import {
  MUTATION_THREE_FIELD_CREATE_STATIC,
  SCHEMA_THREE_FIELDS_ALL_INDEXED,
  SCHEMA_THREE_FIELDS_NO_INDEX,
} from '../deploy-velocity/deploy-velocity-constants';
import { DURATION_30_MINUTES } from '../../utils/duration-constants';
import {
  recordByIdDataValidator,
  recordProviderWithIdState,
  testManagedTableDeployment,
} from '../deploy-velocity/deploy-velocity-test-core';

testManagedTableDeployment({
  name: '3 GSIs updated - Single Record',
  maxDeployDurationMs: DURATION_30_MINUTES,
  initialSchema: SCHEMA_THREE_FIELDS_NO_INDEX,
  updatedSchema: SCHEMA_THREE_FIELDS_ALL_INDEXED,
  dataSetup: recordProviderWithIdState(MUTATION_THREE_FIELD_CREATE_STATIC),
  dataValidate: recordByIdDataValidator(),
});
