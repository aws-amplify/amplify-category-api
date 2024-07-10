import { DefinitionNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode, parse, print } from 'graphql';
import {
  isBuiltInGraphqlNode,
  isSqlStrategy,
  isQueryNode,
  isMutationNode,
  fieldsWithSqlDirective,
} from '@aws-amplify/graphql-transformer-core';
import {
  DataSourceStrategiesProvider,
  isSqlModelDataSourceSsmDbConnectionConfig,
  isSqlModelDataSourceSecretsManagerDbConnectionConfig,
  isSqlModelDataSourceSsmDbConnectionStringConfig,
} from '@aws-amplify/graphql-transformer-interfaces';
import { Token, Arn, ArnFormat } from 'aws-cdk-lib';
import {
  CustomSqlDataSourceStrategy as ConstructCustomSqlDataSourceStrategy,
  ModelDataSourceStrategy as ConstructModelDataSourceStrategy,
} from '../model-datasource-strategy-types';
import { IAmplifyGraphqlDefinition } from '../types';

/**
 * Creates an interface flavor of customSqlDataSourceStrategies from a factory method's schema and data source. Internally, this function
 * scans the fields of `Query` and `Mutation` looking for fields annotated with the `@sql` directive and designates the specified
 * dataSourceStrategy to fulfill those custom queries.
 *
 * Note that we do not scan for `Subscription` fields: `@sql` directives are not allowed on those, and it wouldn't make sense to do so
 * anyway, since subscriptions are processed from an incoming Mutation, not as the result of a direct datasource access.
 */
export const constructCustomSqlDataSourceStrategies = (
  schema: string,
  dataSourceStrategy: ConstructModelDataSourceStrategy,
): ConstructCustomSqlDataSourceStrategy[] => {
  if (!isSqlStrategy(dataSourceStrategy)) {
    return [];
  }

  const parsedSchema = parse(schema);

  const queryNode = parsedSchema.definitions.find(isQueryNode);
  const mutationNode = parsedSchema.definitions.find(isMutationNode);
  if (!queryNode && !mutationNode) {
    return [];
  }

  const customSqlDataSourceStrategies: ConstructCustomSqlDataSourceStrategy[] = [];

  if (queryNode) {
    const fields = fieldsWithSqlDirective(queryNode);
    for (const field of fields) {
      customSqlDataSourceStrategies.push({
        typeName: 'Query',
        fieldName: field.name.value,
        strategy: dataSourceStrategy,
      });
    }
  }

  if (mutationNode) {
    const fields = fieldsWithSqlDirective(mutationNode);
    for (const field of fields) {
      customSqlDataSourceStrategies.push({
        typeName: 'Mutation',
        fieldName: field.name.value,
        strategy: dataSourceStrategy,
      });
    }
  }

  return customSqlDataSourceStrategies;
};

/**
 * Extracts the data source provider from the definition. This jumps through some hoops to avoid changing the public interface. If we decide
 * to change the public interface to simplify the structure, then this process gets a lot simpler.
 */
export const getDataSourceStrategiesProvider = (definition: IAmplifyGraphqlDefinition): DataSourceStrategiesProvider => {
  const provider: DataSourceStrategiesProvider = {
    // We can directly use the interface strategies, even though the SQL strategies have the customSqlStatements field that is unused by the
    // transformer flavor of this type
    dataSourceStrategies: definition.dataSourceStrategies,
    sqlDirectiveDataSourceStrategies: [],
  };

  // We'll collect all the custom SQL statements from the definition into a single map, and use that to make our
  // SqlDirectiveDataSourceStrategies
  const customSqlStatements: Record<string, string> = {};

  const constructSqlStrategies = definition.customSqlDataSourceStrategies ?? [];

  // Note that we're relying on the `customSqlStatements` object reference to stay the same throughout this loop. Don't reassign it, or the
  // collected sqlDirectiveStrategies will break
  constructSqlStrategies.forEach((sqlStrategy) => {
    if (sqlStrategy.strategy.customSqlStatements) {
      Object.assign(customSqlStatements, sqlStrategy.strategy.customSqlStatements);
    }

    provider.sqlDirectiveDataSourceStrategies!.push({
      typeName: sqlStrategy.typeName,
      fieldName: sqlStrategy.fieldName,
      strategy: sqlStrategy.strategy,
      customSqlStatements,
    });
  });

  return provider;
};

/**
 * Creates a new schema by merging the individual schemas contained in the definitions, combining fields of the Query and Mutation types in
 * individual definitions into a single combined definition. Adding directives to `Query` and `Mutation` types participating in a
 * combination is not supported (the behavior is undefined whether those directives are migrated).
 */
export const schemaByMergingDefinitions = (definitions: IAmplifyGraphqlDefinition[]): string => {
  const schema = definitions.map((def) => def.schema).join('\n');
  const parsedSchema = parse(schema);

  // We store the Query & Mutation definitions separately. Since the interfaces are readonly, we'll have to re-compose the types after we've
  // collected all the fields
  const queryAndMutationDefinitions: Record<
    string,
    {
      node: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode;
      fields: FieldDefinitionNode[];
    }
  > = {};

  // Throws if the field has already been encountered
  const validateField = (typeName: string, fieldName: string): void => {
    const fields = queryAndMutationDefinitions[typeName]?.fields;
    if (!fields) {
      return;
    }
    if (fields.find((field) => field.name.value === fieldName)) {
      throw new Error(
        `The custom ${typeName} field '${fieldName}' was found in multiple definitions, but a field name cannot be shared between definitions.`,
      );
    }
  };

  // Transform the schema by reducing Mutation & Query types:
  // - Collect Mutation and Query definitions
  // - Alter the parsed schema by filtering out Mutation & Query types
  // - Add the combined Mutation & Query definitions to the filtered schema
  parsedSchema.definitions.filter(isBuiltInGraphqlNode).forEach((def) => {
    const typeName = def.name.value;
    if (!queryAndMutationDefinitions[typeName]) {
      queryAndMutationDefinitions[typeName] = {
        node: def,
        // `ObjectTypeDefinitionNode.fields` is a ReadonlyArray; so we have to create a new mutable array to collect all the fields
        fields: [...(def.fields ?? [])],
      };
      return;
    }

    (def.fields ?? []).forEach((field) => {
      validateField(typeName, field.name.value);
    });

    queryAndMutationDefinitions[typeName].fields = [...queryAndMutationDefinitions[typeName].fields, ...(def.fields ?? [])];
  });

  // Gather the collected Query & Mutation fields into <=2 new definitions
  const combinedDefinitions = Object.values(queryAndMutationDefinitions)
    .sort((a, b) => a.node.name.value.localeCompare(b.node.name.value))
    .reduce((acc, cur) => {
      const definitionNode = {
        ...cur.node,
        fields: cur.fields,
      };
      return [...acc, definitionNode];
    }, [] as DefinitionNode[]);

  // Filter out the old Query & Mutation definitions
  const filteredDefinitions = parsedSchema.definitions.filter((def) => !isBuiltInGraphqlNode(def));

  // Compose the new schema by appending the collected definitions to the filtered definitions. This means that every query will be
  // rewritten such that the Mutation and Query types appear at the end of the schema.
  const newSchema = {
    ...parsedSchema,
    definitions: [...filteredDefinitions, ...combinedDefinitions],
  };

  const combinedSchemaString = print(newSchema);
  return combinedSchemaString;
};

/*
 * Validates the user input for the dataSourceStrategy. This is a no-op for DynamoDB strategies for now.
 * @param strategy user provided model data source strategy
 * @returns validates and throws an error if the strategy is invalid
 */
export const validateDataSourceStrategy = (strategy: ConstructModelDataSourceStrategy): void => {
  if (!isSqlStrategy(strategy)) {
    return;
  }

  const dbConnectionConfig = strategy.dbConnectionConfig;
  if (
    isSqlModelDataSourceSsmDbConnectionConfig(dbConnectionConfig) ||
    isSqlModelDataSourceSsmDbConnectionStringConfig(dbConnectionConfig)
  ) {
    const ssmPaths = Object.values(dbConnectionConfig).filter((value) => typeof value === 'string');
    if (isSqlModelDataSourceSsmDbConnectionStringConfig(dbConnectionConfig)) {
      const hasMultipleSSMPaths = Array.isArray(dbConnectionConfig?.connectionUriSsmPath);
      if (hasMultipleSSMPaths) {
        if (dbConnectionConfig?.connectionUriSsmPath?.length < 1) {
          throw new Error(`Invalid data source strategy "${strategy.name}". connectionUriSsmPath must be a string or non-empty array.`);
        }
        ssmPaths.push(...dbConnectionConfig.connectionUriSsmPath);
      }
    }

    const invalidSSMPaths = ssmPaths.filter((value) => !isValidSSMPath(value));
    if (invalidSSMPaths.length > 0) {
      throw new Error(
        `Invalid data source strategy "${
          strategy.name
        }". Following SSM paths must start with '/' in dbConnectionConfig: ${invalidSSMPaths.join(', ')}.`,
      );
    }
  } else if (isSqlModelDataSourceSecretsManagerDbConnectionConfig(dbConnectionConfig)) {
    if (!Token.isUnresolved(dbConnectionConfig.secretArn)) {
      try {
        const arnComponents = Arn.split(dbConnectionConfig.secretArn, ArnFormat.COLON_RESOURCE_NAME);
        if (arnComponents.service !== 'secretsmanager' || arnComponents.resource !== 'secret') {
          // error message does not matter because it inside try/catch
          throw new Error();
        }
      } catch {
        throw new Error(`Invalid data source strategy "${strategy.name}". The value of secretArn is not a valid Secrets Manager ARN.`);
      }
    }

    if (dbConnectionConfig.keyArn && !Token.isUnresolved(dbConnectionConfig.keyArn)) {
      try {
        const arnComponents = Arn.split(dbConnectionConfig.keyArn, ArnFormat.SLASH_RESOURCE_NAME);
        if (arnComponents.service !== 'kms' || arnComponents.resource !== 'key') {
          // error message does not matter because it inside try/catch
          throw new Error();
        }
      } catch {
        throw new Error(`Invalid data source strategy "${strategy.name}". The value of keyArn is not a valid KMS ARN.`);
      }
    }
  } else {
    throw new Error(`Invalid data source strategy "${strategy.name}". dbConnectionConfig does not include SSM paths or Secret ARN.`);
  }
};

const isValidSSMPath = (path: string): boolean => {
  return path.startsWith('/');
};
