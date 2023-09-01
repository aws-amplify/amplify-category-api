import * as os from 'os';
import { SchemaFile } from 'aws-cdk-lib/aws-appsync';
import { IAmplifyGraphqlSchema } from './types';

const noOpSchema: Omit<IAmplifyGraphqlSchema, 'definition'> = {
  functionSlots: () => [],
};

export class AmplifyGraphqlSchema {
  static fromString = (schema: string): IAmplifyGraphqlSchema => ({
    ...noOpSchema,
    definition: () => schema,
  });

  static fromSchemaFile = (schemaFile: SchemaFile): IAmplifyGraphqlSchema => ({
    ...noOpSchema,
    definition: () => schemaFile.definition,
  });

  static fromSchemaFiles = (schemaFiles: SchemaFile[]): IAmplifyGraphqlSchema => ({
    ...noOpSchema,
    definition: () => schemaFiles.map((schemaFile) => schemaFile.definition).join(os.EOL),
  });
}
