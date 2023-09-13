import * as os from 'os';
import { SchemaFile } from 'aws-cdk-lib/aws-appsync';
import { IAmplifyGraphqlSchema } from './types';

/**
 * Class exposing utilities to produce IAmplifyGraphqlSchema objects given various inputs.
 */
export class AmplifyGraphqlSchema {
  /**
   * Produce a schema definition from a string input
   * @param schema the graphql input as a string
   * @returns a fully formed amplify graphql schema interface
   */
  static fromString(schema: string): IAmplifyGraphqlSchema {
    return {
      definition: schema,
      functionSlots: [],
    };
  }

  /**
   * Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema
   * @param schemaFiles the schema files to process
   * @returns a fully formed amplify graphql schema interface
   */
  static fromSchemaFiles(...schemaFiles: SchemaFile[]): IAmplifyGraphqlSchema {
    return {
      definition: schemaFiles.map((schemaFile) => schemaFile.definition).join(os.EOL),
      functionSlots: [],
    };
  }
}
