import * as fs from 'fs';
import * as os from 'os';
import { SchemaFile } from 'aws-cdk-lib/aws-appsync';
import { FromSqlSchemaFilesProps, IAmplifyGraphqlDefinition } from './types';
import { AmplifySqlBoundGraphqlApiDefinition } from './sql-bound-graphql-api-definition';

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

  /**
   * Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema, bound to
   * a SQL data source
   * @param options configuration options for the definition
   * @param filePaths paths to the graphql files that comprise the API definition to be bound to the specified SQL database
   */
  static fromSqlSchemaFiles(options: FromSqlSchemaFilesProps, ...filePaths: string[]): IAmplifyGraphqlDefinition {
    const schema = filePaths.map((filePath) => new SchemaFile({ filePath }).definition).join(os.EOL);

    let sqlStatements: Record<string, string> | undefined;
    if (options.customSqlFiles) {
      sqlStatements = Object.entries(options.customSqlFiles).reduce((acc, [ref, path]): Record<string, string> => {
        acc[ref] = fs.readFileSync(path, 'utf8');
        return acc;
      }, {} as Record<string, string>);
    }

    return new AmplifySqlBoundGraphqlApiDefinition({
      schema,
      customSqlStatements: sqlStatements,
      vpcConfig: options.vpcConfig,
      engineType: options.engineType,
      dbConnectionConfig: options.dbConnectionConfig,
    });
  }
}
