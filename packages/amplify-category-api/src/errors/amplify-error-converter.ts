import {
  $TSAny, AmplifyError, AmplifyErrorType,
} from 'amplify-cli-core';

const amplifyErrorList = [
  'InvalidDirectiveError',
  'InvalidTransformerError',
  'SchemaValidationError',
  'TransformerContractError',
  'DestructiveMigrationError',
  'InvalidMigrationError',
  'InvalidGSIMigrationError',
  'UnknownDirectiveError',
  'GraphQLError',
];

/**
 * error can be an AmplifyException Type or  Error type or any type
 */
export class AmplifyErrorConverter {
  /**
   * create
  * @param error : default error to be thrown if not present in list : amplifyErrorList
   */
  create = (error: $TSAny): $TSAny => {
    if (error instanceof Error && error?.name && amplifyErrorList.includes(error.name)) {
      const amplifyErrorType = `${error.name}` as AmplifyErrorType;
      return new AmplifyError(
        amplifyErrorType,
        {
          message: error.message,
        },
        error,
      );
    }
    return error;
  }
}
