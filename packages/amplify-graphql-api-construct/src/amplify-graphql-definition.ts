import * as os from 'os';
import { SchemaFile } from 'aws-cdk-lib/aws-appsync';
import { IAmplifyGraphqlDefinition } from './types';

/**
 * Class exposing utilities to produce IAmplifyGraphqlDefinition objects given various inputs.
 */
export class AmplifyGraphqlDefinition {
  /**
   * Produce a schema definition from a string input
   * @param schema the graphql input as a string
   * @returns a fully formed amplify graphql definition
   */
  static fromString(schema: string): IAmplifyGraphqlDefinition {
    return {
      schema,
      functionSlots: [],
    };
  }

  /**
   * Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema
   * @param filePaths one or more paths to the graphql files to process
   * @returns a fully formed amplify graphql definition
   */
  static fromFiles(...filePaths: string[]): IAmplifyGraphqlDefinition {
    return {
      schema: filePaths.map((filePath) => new SchemaFile({ filePath }).definition).join(os.EOL),
      functionSlots: [],
    };
  }
}
