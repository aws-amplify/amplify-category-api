import * as os from 'os';
import { SchemaFile } from 'aws-cdk-lib/aws-appsync';
import { parse, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { ModelDataSourceDefinition, IAmplifyGraphqlDefinition } from './types';

/**
 * Class exposing utilities to produce IAmplifyGraphqlDefinition objects given various inputs.
 */
export class AmplifyGraphqlDefinition {
  /**
   * Produce a schema definition from a string input.
   * @param schema the graphql input as a string
   * @param defaultModelDataSourceDefinition the ModelDataSourceDefinition to use for the schema. This parameter is @experimental
   * @param modelDataSourceDefinitions explicitly-specified model-to-ModelDataSourceDefinitions
   * @returns a fully formed amplify graphql definition, whose models will be resolved by the data source specifed in the
   *   ModelDataSourceDefinitions
   */
  static fromString(
    schema: string,
    defaultModelDataSourceDefinition?: ModelDataSourceDefinition,
    modelDataSourceDefinitions?: Record<string, ModelDataSourceDefinition>,
  ): IAmplifyGraphqlDefinition {
    const resolvedModelDataSourceDefinitions = resolveDefaultDefinitions(
      schema,
      defaultModelDataSourceDefinition ?? DEFAULT_DATA_SOURCE_DEF,
      modelDataSourceDefinitions ?? {},
    );

    return {
      schema,
      modelDataSourceDefinitions: resolvedModelDataSourceDefinitions,
      functionSlots: [],
    };
  }

  /**
   * Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema, binding them to an Amplify-provisioned DynamoDB data
   * source.
   * @param filePaths one or more paths to the graphql files to process
   * @returns a fully formed amplify graphql definition, whose models will be resolved by DynamoDB tables created during deployment.
   */
  static fromFiles(...filePaths: string[]): IAmplifyGraphqlDefinition {
    return AmplifyGraphqlDefinition.fromFilesAndDefinitions(filePaths, DEFAULT_DATA_SOURCE_DEF);
  }

  /**
   * Convert one or more appsync SchemaFile objects into an Amplify Graphql Schema, binding them to a ModelDataSourceDefinition.
   * @param filePaths one or more paths to the graphql files to process
   * @param defaultModelDataSourceDefinition the ModelDataSourceDefinition to use for the schema. This parameter is @experimental
   * @param modelDataSourceDefinitions explicitly-specified model-to-ModelDataSourceDefinitions
   * @returns a fully formed amplify graphql definition, whose models will be resolved by the data sources specifed in the
   *   ModelDataSourceDefinitions
   * @experimental
   */
  static fromFilesAndDefinitions(
    filePaths: string[],
    defaultModelDataSourceDefinition: ModelDataSourceDefinition,
    modelDataSourceDefinitions?: Record<string, ModelDataSourceDefinition>,
  ): IAmplifyGraphqlDefinition {
    const schema = filePaths.map((filePath) => new SchemaFile({ filePath }).definition).join(os.EOL);
    return AmplifyGraphqlDefinition.fromString(schema, defaultModelDataSourceDefinition, modelDataSourceDefinitions);
  }

  /**
   * Combines multiple IAmplifyGraphqlDefinitions into a single definition.
   * @param definitions the definitions to combine
   */
  static combine(definitions: IAmplifyGraphqlDefinition[]): IAmplifyGraphqlDefinition {
    const allSchemas: string[] = [];
    const allModelDataSourceDefinitions: Record<string, ModelDataSourceDefinition> = {};

    for (const definition of definitions) {
      allSchemas.push(definition.schema);
      for (const [modelName, modelDataSourceDefinition] of Object.entries(definition.modelDataSourceDefinitions)) {
        if (allModelDataSourceDefinitions[modelName]) {
          throw new Error(`Duplicate model name: ${modelName}`);
        }
        allModelDataSourceDefinitions[modelName] = modelDataSourceDefinition;
      }
    }

    return {
      schema: allSchemas.join(os.EOL),
      modelDataSourceDefinitions: allModelDataSourceDefinitions,
      functionSlots: [],
    };
  }
}

const DEFAULT_DATA_SOURCE_DEF: ModelDataSourceDefinition = {
  name: 'DefaultDynamoDBDataSource',
  strategy: {
    dbType: 'DYNAMODB',
    provisionStrategy: 'DEFAULT',
  },
};

/**
 * Parses the schema, and applies the `defaultModelDataSourceDefinition` to each model not explicitly listed in
 * `modelDataSourceDefinitions`.
 * @param schema the graphql schema
 * @param defaultModelDataSourceDefinition the default data source definition to apply to any unspecified models
 * @param modelDataSourceDefinitions a mapping of model names to data source definitions to apply to each model
 * @returns ModelDataSourceDefinitions for each model in `schema`
 */
const resolveDefaultDefinitions = (
  schema: string,
  defaultModelDataSourceDefinition: ModelDataSourceDefinition = DEFAULT_DATA_SOURCE_DEF,
  modelDataSourceDefinitions?: Record<string, ModelDataSourceDefinition>,
): Record<string, ModelDataSourceDefinition> => {
  const parsedSchema = parse(schema);
  const allModelDataSourceDefinitions: Record<string, ModelDataSourceDefinition> = parsedSchema.definitions
    .filter((obj) => obj.kind === Kind.OBJECT_TYPE_DEFINITION && obj.directives?.some((dir) => dir.name.value === 'model'))
    .map((type) => (type as ObjectTypeDefinitionNode).name.value)
    .filter((modelName) => !allModelDataSourceDefinitions[modelName])
    .reduce((acc, curr) => {
      acc[curr] = defaultModelDataSourceDefinition;
      return acc;
    }, modelDataSourceDefinitions ?? {});

  return allModelDataSourceDefinitions;
};
