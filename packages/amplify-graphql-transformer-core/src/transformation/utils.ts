import {
  DefinitionNode,
  DirectiveDefinitionNode,
  DirectiveNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  InputValueDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  parse,
  print,
  StringValueNode,
  TypeDefinitionNode,
  TypeExtensionNode,
  TypeSystemDefinitionNode,
  TypeSystemExtensionNode,
} from 'graphql';
import {
  ModelDataSourceStrategy,
  SqlDirectiveDataSourceStrategy,
  TransformerPluginProvider,
  TransformerPluginType,
} from '@aws-amplify/graphql-transformer-interfaces';
import _ from 'lodash';
import { fieldsWithSqlDirective, isMutationNode, isQueryNode, isSqlStrategy } from '../utils';
import { InvalidDirectiveError } from '../errors';

export const makeSeenTransformationKey = (
  directive: DirectiveNode,
  type: TypeDefinitionNode | TypeExtensionNode,
  field?: FieldDefinitionNode | InputValueDefinitionNode | EnumValueDefinitionNode,
  arg?: InputValueDefinitionNode,
  index?: number,
): string => {
  let key = '';
  if (directive && type && field && arg) {
    key = `${type.name.value}.${field.name.value}.${arg.name.value}@${directive.name.value}`;
  }
  if (directive && type && field) {
    key = `${type.name.value}.${field.name.value}@${directive.name.value}`;
  } else {
    key = `${type.name.value}@${directive.name.value}`;
  }
  if (index !== undefined) {
    key += `[${index}]`;
  }
  return key;
};

/**
 * If this instance of the directive validates against its definition return true.
 * If the definition does not apply to the instance return false.
 * @param definition The directive definition to validate against.
 * @param directive The directive declaration to be validated.
 * @param node The node where the directive was found.
 */
export const matchDirective = (
  definition: DirectiveDefinitionNode,
  directive: DirectiveNode,
  node: TypeSystemDefinitionNode | TypeSystemExtensionNode,
): boolean => {
  if (!directive) {
    return false;
  }
  if (definition.name.value !== directive.name.value) {
    // The definition is for the wrong directive. Do not match.
    return false;
  }
  let isValidLocation = false;

  // At this point, we know that the directive applied to the node matches the definition. Before we validate the location, we need to
  // explicitly disallow directives on extended types.
  //
  // Per https://spec.graphql.org/October2021/#sec-Type-System.Directives, this is not supported (the locations enum does not include any
  // type extensions), but the `graphql.parse()` function does not throw an error when parsing.
  // when encountering an extended type. So we need to explicitly check for extended types here.
  if (node.kind === Kind.OBJECT_TYPE_EXTENSION || node.kind === Kind.INTERFACE_TYPE_EXTENSION) {
    throw new InvalidDirectiveError(
      `Directives are not supported on object or interface extensions. See the '@${directive.name.value}' directive on '${node.name.value}'`,
    );
  }

  for (const location of definition.locations) {
    // tslint:disable-next-line: switch-default
    switch (location.value) {
      case 'SCHEMA':
        isValidLocation = node.kind === Kind.SCHEMA_DEFINITION || isValidLocation;
        break;
      case 'SCALAR':
        isValidLocation = node.kind === Kind.SCALAR_TYPE_DEFINITION || isValidLocation;
        break;
      case 'OBJECT':
        isValidLocation = node.kind === Kind.OBJECT_TYPE_DEFINITION || isValidLocation;
        break;
      case 'FIELD_DEFINITION':
        isValidLocation = (node.kind as string) === Kind.FIELD_DEFINITION || isValidLocation;
        break;
      case 'ARGUMENT_DEFINITION':
        isValidLocation = (node.kind as string) === Kind.INPUT_VALUE_DEFINITION || isValidLocation;
        break;
      case 'INTERFACE':
        isValidLocation = node.kind === Kind.INTERFACE_TYPE_DEFINITION || isValidLocation;
        break;
      case 'UNION':
        isValidLocation = node.kind === Kind.UNION_TYPE_DEFINITION || isValidLocation;
        break;
      case 'ENUM':
        isValidLocation = node.kind === Kind.ENUM_TYPE_DEFINITION || isValidLocation;
        break;
      case 'ENUM_VALUE':
        isValidLocation = (node.kind as string) === Kind.ENUM_VALUE_DEFINITION || isValidLocation;
        break;
      case 'INPUT_OBJECT':
        isValidLocation = node.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION || isValidLocation;
        break;
      case 'INPUT_FIELD_DEFINITION':
        isValidLocation = (node.kind as string) === Kind.INPUT_VALUE_DEFINITION || isValidLocation;
        break;
      default:
        break;
    }
  }
  return isValidLocation;
};

export const matchFieldDirective = (definition: DirectiveDefinitionNode, directive: DirectiveNode, node: FieldDefinitionNode): boolean => {
  if (definition.name.value !== directive.name.value) {
    // The definition is for the wrong directive. Do not match.
    return false;
  }
  let isValidLocation = false;
  for (const location of definition.locations) {
    switch (location.value) {
      case 'FIELD_DEFINITION':
        isValidLocation = node.kind === Kind.FIELD_DEFINITION || isValidLocation;
        break;
      default:
        break;
    }
  }
  return isValidLocation;
};

export const matchInputFieldDirective = (
  definition: DirectiveDefinitionNode,
  directive: DirectiveNode,
  node: InputValueDefinitionNode,
): boolean => {
  if (definition.name.value !== directive.name.value) {
    // The definition is for the wrong directive. Do not match.
    return false;
  }
  let isValidLocation = false;
  for (const location of definition.locations) {
    switch (location.value) {
      case 'INPUT_FIELD_DEFINITION':
        isValidLocation = node.kind === Kind.INPUT_VALUE_DEFINITION || isValidLocation;
        break;
      default:
        break;
    }
  }
  return isValidLocation;
};

export const matchArgumentDirective = (
  definition: DirectiveDefinitionNode,
  directive: DirectiveNode,
  node: InputValueDefinitionNode,
): boolean => {
  if (definition.name.value !== directive.name.value) {
    // The definition is for the wrong directive. Do not match.
    return false;
  }
  let isValidLocation = false;
  for (const location of definition.locations) {
    switch (location.value) {
      case 'ARGUMENT_DEFINITION':
        isValidLocation = node.kind === Kind.INPUT_VALUE_DEFINITION || isValidLocation;
        break;
      default:
        break;
    }
  }
  return isValidLocation;
};

export const matchEnumValueDirective = (
  definition: DirectiveDefinitionNode,
  directive: DirectiveNode,
  node: EnumValueDefinitionNode,
): boolean => {
  if (definition.name.value !== directive.name.value) {
    // The definition is for the wrong directive. Do not match.
    return false;
  }
  let isValidLocation = false;
  for (const location of definition.locations) {
    switch (location.value) {
      case 'ENUM_VALUE':
        isValidLocation = node.kind === Kind.ENUM_VALUE_DEFINITION || isValidLocation;
        break;
      default:
        break;
    }
  }
  return isValidLocation;
};

/**
 * Sort the plugin such that the DataSourceProviders are executed before dataSourceEnhancement plugins are executed
 * @param plugins plugin instances passed to the transformer
 */
export const sortTransformerPlugins = (plugins: TransformerPluginProvider[]): TransformerPluginProvider[] => {
  const SORT_ORDER: TransformerPluginType[] = [
    TransformerPluginType.DATA_SOURCE_PROVIDER,
    TransformerPluginType.DATA_SOURCE_ENHANCER,
    TransformerPluginType.GENERIC,
    TransformerPluginType.AUTH,
  ];
  return plugins.sort((a, b) => {
    const aIdx = SORT_ORDER.indexOf(a.pluginType);
    const bIdx = SORT_ORDER.indexOf(b.pluginType);
    return aIdx - bIdx;
  });
};

/**
 * Return the input schema with the `Amplify` input node stripped.
 * @param schema the input schema to scrub
 * @returns the input shema without the `Amplify` input node
 */
export const removeAmplifyInputDefinition = (schema: string): string => {
  if (_.isEmpty(schema)) {
    return schema;
  }

  const { definitions, ...rest } = parse(schema);

  const isAmplifyInputNode = (definition: DefinitionNode): boolean =>
    definition.kind === 'InputObjectTypeDefinition' && definition.name.value === 'Amplify';

  return print({
    definitions: definitions.filter((definition: DefinitionNode) => !isAmplifyInputNode(definition)),
    ...rest,
  });
};

const MODEL_DIRECTIVE_NAME = 'model';
const MANY_TO_MANY_DIRECTIVE_NAME = 'manyToMany';

/**
 * Get the type names with model directives in the GraphQL schema in SDL
 * @param schema graphql schema in SDL
 * @returns type names which model diretives are attached
 */
export const getModelTypeNames = (schema: string): string[] => {
  const parsedSchema = parse(schema);
  const nodesWithModelDirective = parsedSchema.definitions.filter(
    (obj) => obj.kind === Kind.OBJECT_TYPE_DEFINITION && obj.directives?.some((dir) => dir.name.value === MODEL_DIRECTIVE_NAME),
  );
  const modelKeys = nodesWithModelDirective.map((type) => (type as ObjectTypeDefinitionNode).name.value);
  nodesWithModelDirective.forEach((obj) => {
    const { fields } = obj as ObjectTypeDefinitionNode;
    fields?.forEach((field) => {
      field.directives?.forEach((dir) => {
        if (dir.name.value === MANY_TO_MANY_DIRECTIVE_NAME) {
          const relationArg = dir.arguments?.find((arg) => arg.name.value === 'relationName');
          if (relationArg) {
            modelKeys.push((relationArg.value as StringValueNode).value);
          }
        }
      });
    });
  });
  return modelKeys.filter((key, idx) => modelKeys.indexOf(key) === idx);
};

/**
 * Return a Record associating the ModelDataSourceStrategy with each `@model`-annotated type in the schema.
 * @param schema the schema to parse
 * @param dataSourceStrategy the strategy to associate with each `@model` in the schema
 */
export const constructDataSourceStrategies = (
  schema: string,
  dataSourceStrategy: ModelDataSourceStrategy,
): Record<string, ModelDataSourceStrategy> => {
  const modelKeys = getModelTypeNames(schema);
  return modelKeys.reduce((acc, cur) => ({ ...acc, [cur]: dataSourceStrategy }), {});
};

/**
 * Creates a customSqlDataSourceStrategies array from a schema and strategy. Internally, this function scans the fields of `Query` and
 * `Mutation` looking for fields annotated with the `@sql` directive and designates the specified dataSourceStrategy to fulfill those custom
 * queries.
 *
 * Note that we do not scan for `Subscription` fields: `@sql` directives are not allowed on those, and it wouldn't make sense to do so
 * anyway, since subscriptions are processed from an incoming Mutation, not as the result of a direct datasource access.
 *
 * This method is largely the same as the utility in amplify-graphql-api-construct, but targeted toward the transformer type.
 */
export const constructSqlDirectiveDataSourceStrategies = (
  schema: string,
  dataSourceStrategy: ModelDataSourceStrategy,
  customSqlStatements?: Record<string, string>,
): SqlDirectiveDataSourceStrategy[] => {
  if (!isSqlStrategy(dataSourceStrategy)) {
    return [];
  }

  const parsedSchema = parse(schema);

  const queryNode = parsedSchema.definitions.find(isQueryNode);
  const mutationNode = parsedSchema.definitions.find(isMutationNode);
  if (!queryNode && !mutationNode) {
    return [];
  }

  const sqlDirectiveDataSourceStrategies: SqlDirectiveDataSourceStrategy[] = [];

  if (queryNode) {
    const fields = fieldsWithSqlDirective(queryNode);
    for (const field of fields) {
      sqlDirectiveDataSourceStrategies.push({
        typeName: 'Query',
        fieldName: field.name.value,
        strategy: dataSourceStrategy,
        customSqlStatements,
      });
    }
  }

  if (mutationNode) {
    const fields = fieldsWithSqlDirective(mutationNode);
    for (const field of fields) {
      sqlDirectiveDataSourceStrategies.push({
        typeName: 'Mutation',
        fieldName: field.name.value,
        strategy: dataSourceStrategy,
        customSqlStatements,
      });
    }
  }

  return sqlDirectiveDataSourceStrategies;
};
