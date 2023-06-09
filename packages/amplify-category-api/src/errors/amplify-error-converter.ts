import { AmplifyError, AmplifyErrorType } from '@aws-amplify/amplify-cli-core';

const amplifyGraphQLErrorCodes = new Set([
  'InvalidDirectiveError',
  'InvalidTransformerError',
  'SchemaValidationError',
  'TransformerContractError',
  'DestructiveMigrationError',
  'InvalidMigrationError',
  'InvalidGSIMigrationError',
  'UnknownDirectiveError',
  'GraphQLError',
  'ApiCategorySchemaNotFoundError',
  'InvalidOverrideError',
]);

/**
 * error can be an AmplifyException Type or  Error type or any type
 */
export abstract class AmplifyGraphQLTransformerErrorConverter {
  /**
   * create
   * @param error : default error to be thrown if not present in list : amplifyErrorList
   */
  static convert = (error: any): any => {
    if (error instanceof Error && error?.name && amplifyGraphQLErrorCodes.has(error.name)) {
      const amplifyErrorType = `${error.name}` as AmplifyErrorType;
      return new AmplifyError(
        amplifyErrorType,
        {
          message: error.message, // message is not enumerable
          ...error,
        },
        error,
      );
    }
    return error;
  };
}
