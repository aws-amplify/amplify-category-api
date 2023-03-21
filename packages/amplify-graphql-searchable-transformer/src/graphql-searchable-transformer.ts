import {
  DirectiveWrapper,
  generateGetArgumentsInput,
  InvalidDirectiveError,
  MappingTemplate,
  TransformerPluginBase,
} from '@aws-amplify/graphql-transformer-core';
import {
  DataSourceProvider,
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DynamoDbDataSource } from 'aws-cdk-lib/aws-appsync';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import {
  ArnFormat, CfnCondition, CfnParameter, Fn,
} from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { DirectiveNode, InputObjectTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { Expression, str } from 'graphql-mapping-template';
import {
  ResourceConstants,
  getBaseType,
  ModelResourceIDs,
  STANDARD_SCALARS,
  blankObject,
  blankObjectExtension,
  defineUnionType,
  extensionWithFields,
  makeField,
  makeListType,
  makeNamedType,
  makeNonNullType,
  makeInputValueDefinition,
  graphqlName,
  plurality,
  toUpper,
  ResolverResourceIDs,
  makeDirective,
} from 'graphql-transformer-common';
import { createParametersStack as createParametersInStack } from './cdk/create-cfnParameters';
import { requestTemplate, responseTemplate, sandboxMappingTemplate } from './generate-resolver-vtl';
import {
  makeSearchableScalarInputObject,
  makeSearchableSortDirectionEnumObject,
  makeSearchableXFilterInputObject,
  makeSearchableXSortableFieldsEnumObject,
  makeSearchableXAggregateFieldEnumObject,
  makeSearchableXSortInputObject,
  makeSearchableXAggregationInputObject,
  makeSearchableAggregateTypeEnumObject,
  AGGREGATE_TYPES,
  extendTypeWithDirectives,
  DATASTORE_SYNC_FIELDS,
} from './definitions';
import { setMappings } from './cdk/create-layer-cfnMapping';
import { createSearchableDomain, createSearchableDomainRole } from './cdk/create-searchable-domain';
import { createSearchableDataSource } from './cdk/create-searchable-datasource';
import { createEventSourceMapping, createLambda, createLambdaRole } from './cdk/create-streaming-lambda';
import { createStackOutputs } from './cdk/create-cfnOutput';
import { shouldEnableNodeToNodeEncryption } from './nodeToNodeEncryption';

const nonKeywordTypes = ['Int', 'Float', 'Boolean', 'AWSTimestamp', 'AWSDate', 'AWSDateTime'];
const STACK_NAME = 'SearchableStack';

const getTable = (context: TransformerContextProvider, definition: ObjectTypeDefinitionNode): IConstruct => {
  const ddbDataSource = context.dataSources.get(definition) as DynamoDbDataSource;
  const tableName = ModelResourceIDs.ModelTableResourceID(definition.name.value);
  const table = ddbDataSource.ds.stack.node.findChild(tableName);
  return table;
};

const getNonKeywordFields = (def: ObjectTypeDefinitionNode): Expression[] => {
  const nonKeywordTypeSet = new Set(nonKeywordTypes);
  return def.fields?.filter((field) => nonKeywordTypeSet.has(getBaseType(field.type))
    && !DATASTORE_SYNC_FIELDS.includes(field.name.value)).map((field) => str(field.name.value)) || [];
};

/**
 * Returns all the keys fields - primaryKey and sortKeys
 * @param primaryKey primary key field name
 * @param table model table
 * @returns Expression[] keyFields
 */
const getKeyFields = (primaryKey: string, table: IConstruct): Expression[] => {
  const keyFields = [];
  keyFields.push(primaryKey);
  const { attributeName } = (table as any).keySchema.find((att: any) => att.keyType === 'RANGE') || {};
  if (attributeName) {
    keyFields.push(...attributeName.split('#'));
  }
  return keyFields.map((key) => str(key));
};

const generateSearchableXConnectionType = (ctx: TransformerSchemaVisitStepContextProvider, definition: ObjectTypeDefinitionNode): void => {
  const searchableXConnectionName = `Searchable${definition.name.value}Connection`;
  if (ctx.output.hasType(searchableXConnectionName)) {
    return;
  }

  // Create the TableXConnection
  const connectionType = blankObject(searchableXConnectionName);
  ctx.output.addObject(connectionType);

  // Create TableXConnection type with items and nextToken
  let connectionTypeExtension = blankObjectExtension(searchableXConnectionName);
  connectionTypeExtension = extensionWithFields(connectionTypeExtension, [
    makeField('items', [], makeNonNullType(makeListType(makeNamedType(definition.name.value)))),
  ]);
  connectionTypeExtension = extensionWithFields(connectionTypeExtension, [
    makeField('nextToken', [], makeNamedType('String')),
    makeField('total', [], makeNamedType('Int')),
    makeField('aggregateItems', [], makeNonNullType(makeListType(makeNamedType('SearchableAggregateResult')))),
  ]);
  ctx.output.addObjectExtension(connectionTypeExtension);
};

const generateSearchableAggregateScalarResultType = (ctx: TransformerSchemaVisitStepContextProvider): string => {
  const searchableAggregateScalarResult = 'SearchableAggregateScalarResult';
  if (ctx.output.hasType(searchableAggregateScalarResult)) {
    return searchableAggregateScalarResult;
  }

  // Create the SearchableAggregateScalarResult
  const aggregateScalarType = blankObject(searchableAggregateScalarResult);
  ctx.output.addObject(aggregateScalarType);

  // Create SearchableAggregateScalarResult type with value
  let aggregateScalarTypeExtension = blankObjectExtension(searchableAggregateScalarResult);
  aggregateScalarTypeExtension = extensionWithFields(aggregateScalarTypeExtension, [
    makeField('value', [], makeNonNullType(makeNamedType('Float'))),
  ]);
  ctx.output.addObjectExtension(aggregateScalarTypeExtension);
  return searchableAggregateScalarResult;
};

const generateSearchableAggregateBucketResultItemType = (ctx: TransformerSchemaVisitStepContextProvider): string => {
  const searchableAggregateBucketResultItem = 'SearchableAggregateBucketResultItem';
  if (ctx.output.hasType(searchableAggregateBucketResultItem)) {
    return searchableAggregateBucketResultItem;
  }

  // Create the SearchableAggregateBucketResultItem
  const aggregateBucketResultItemType = blankObject(searchableAggregateBucketResultItem);
  ctx.output.addObject(aggregateBucketResultItemType);

  // Create SearchableAggregateBucketResultItem type with key and doc_count
  let aggregateBucketResultItemTypeExtension = blankObjectExtension(searchableAggregateBucketResultItem);
  aggregateBucketResultItemTypeExtension = extensionWithFields(aggregateBucketResultItemTypeExtension, [
    makeField('key', [], makeNonNullType(makeNamedType('String'))),
    makeField('doc_count', [], makeNonNullType(makeNamedType('Int'))),
  ]);
  ctx.output.addObjectExtension(aggregateBucketResultItemTypeExtension);
  return searchableAggregateBucketResultItem;
};

const generateSearchableAggregateBucketResultType = (ctx: TransformerSchemaVisitStepContextProvider): string => {
  const searchableAggregateBucketResult = 'SearchableAggregateBucketResult';
  if (ctx.output.hasType(searchableAggregateBucketResult)) {
    return searchableAggregateBucketResult;
  }

  // Create the SearchableAggregateBucketResultItem
  const aggregateBucketResultType = blankObject(searchableAggregateBucketResult);
  ctx.output.addObject(aggregateBucketResultType);
  generateSearchableAggregateBucketResultItemType(ctx);

  // Create SearchableAggregateBucketResultItem type with buckets
  let aggregateBucketResultTypeExtension = blankObjectExtension(searchableAggregateBucketResult);
  aggregateBucketResultTypeExtension = extensionWithFields(aggregateBucketResultTypeExtension, [
    makeField('buckets', [], makeListType(makeNamedType('SearchableAggregateBucketResultItem'))),
  ]);
  ctx.output.addObjectExtension(aggregateBucketResultTypeExtension);
  return searchableAggregateBucketResult;
};

const generateSearchableGenericResultType = (ctx: TransformerSchemaVisitStepContextProvider): void => {
  const searchableAggregateGenericResult = 'SearchableAggregateGenericResult';
  if (ctx.output.hasType(searchableAggregateGenericResult)) {
    return;
  }

  const searchableAggregateGenericResultNode = defineUnionType(searchableAggregateGenericResult, [
    makeNamedType(generateSearchableAggregateScalarResultType(ctx)),
    makeNamedType(generateSearchableAggregateBucketResultType(ctx)),
  ]);

  ctx.output.addUnion(searchableAggregateGenericResultNode);
};

const generateSearchableAggregateResultType = (ctx: TransformerSchemaVisitStepContextProvider): string => {
  const searchableAggregateResult = 'SearchableAggregateResult';
  if (ctx.output.hasType(searchableAggregateResult)) {
    return searchableAggregateResult;
  }

  // Create the SearchableAggregateResult
  const aggregateResultType = blankObject(searchableAggregateResult);
  ctx.output.addObject(aggregateResultType);

  // Create SearchableAggregateResult type with name and result
  let aggregateResultTypeExtension = blankObjectExtension(searchableAggregateResult);
  aggregateResultTypeExtension = extensionWithFields(aggregateResultTypeExtension, [
    makeField('name', [], makeNonNullType(makeNamedType('String'))),
    makeField('result', [], makeNamedType('SearchableAggregateGenericResult')),
  ]);
  ctx.output.addObjectExtension(aggregateResultTypeExtension);
  return searchableAggregateResult;
};

const generateSearchableAggregateTypes = (ctx: TransformerSchemaVisitStepContextProvider): void => {
  generateSearchableAggregateResultType(ctx);
  generateSearchableGenericResultType(ctx);
};

const generateSearchableInputs = (ctx: TransformerSchemaVisitStepContextProvider, definition: ObjectTypeDefinitionNode): void => {
  const inputs: string[] = Object.keys(STANDARD_SCALARS);
  inputs
    .filter((input) => !ctx.output.hasType(`Searchable${input}FilterInput`))
    .map(makeSearchableScalarInputObject)
    .forEach((node: InputObjectTypeDefinitionNode) => ctx.output.addInput(node));

  const searchableXQueryFilterInput = makeSearchableXFilterInputObject(definition, ctx.inputDocument);
  if (!ctx.output.hasType(searchableXQueryFilterInput.name.value)) {
    ctx.output.addInput(searchableXQueryFilterInput);
  }

  if (!ctx.output.hasType('SearchableSortDirection')) {
    const searchableSortDirection = makeSearchableSortDirectionEnumObject();
    ctx.output.addEnum(searchableSortDirection);
  }

  if (!ctx.output.hasType(`Searchable${definition.name.value}SortableFields`)) {
    const searchableXSortableFieldsDirection = makeSearchableXSortableFieldsEnumObject(definition);
    ctx.output.addEnum(searchableXSortableFieldsDirection);
  }

  if (!ctx.output.hasType(`Searchable${definition.name.value}SortInput`)) {
    const searchableXSortableInputDirection = makeSearchableXSortInputObject(definition);
    ctx.output.addInput(searchableXSortableInputDirection);
  }

  if (!ctx.output.hasType('SearchableAggregateType')) {
    const searchableAggregateTypeEnum = makeSearchableAggregateTypeEnumObject();
    ctx.output.addEnum(searchableAggregateTypeEnum);
  }

  if (!ctx.output.hasType(`Searchable${definition.name.value}AggregateField`)) {
    const searchableXAggregationField = makeSearchableXAggregateFieldEnumObject(definition, ctx.inputDocument);
    ctx.output.addEnum(searchableXAggregationField);
  }

  if (!ctx.output.hasType(`Searchable${definition.name.value}AggregationInput`)) {
    const searchableXAggregationInput = makeSearchableXAggregationInputObject(definition);
    ctx.output.addInput(searchableXAggregationInput);
  }
};

export class SearchableModelTransformer extends TransformerPluginBase {
  searchableObjectTypeDefinitions: { node: ObjectTypeDefinitionNode; fieldName: string }[];
  searchableObjectNames: string[];

  constructor(private apiName?: string) {
    super(
      'amplify-searchable-transformer',
      /* GraphQL */ `
        directive @searchable(queries: SearchableQueryMap) on OBJECT
        input SearchableQueryMap {
          search: String
        }
      `,
    );
    this.searchableObjectTypeDefinitions = [];
    this.searchableObjectNames = [];
  }

  generateResolvers = (context: TransformerContextProvider): void => {
    const { Env } = ResourceConstants.PARAMETERS;

    const { HasEnvironmentParameter } = ResourceConstants.CONDITIONS;

    const stack = context.stackManager.createStack(STACK_NAME);

    setMappings(stack);

    const envParam = context.stackManager.getParameter(Env) as CfnParameter;

    // eslint-disable-next-line no-new
    new CfnCondition(stack, HasEnvironmentParameter, {
      expression: Fn.conditionNot(Fn.conditionEquals(envParam, ResourceConstants.NONE)),
    });

    const isProjectUsingDataStore = context.isProjectUsingDataStore();

    stack.templateOptions.description = 'An auto-generated nested stack for searchable.';
    stack.templateOptions.templateFormatVersion = '2010-09-09';

    const parameterMap = createParametersInStack(context.stackManager.rootStack);

    const nodeToNodeEncryption = this.apiName ? shouldEnableNodeToNodeEncryption(this.apiName) : false;

    const domain = createSearchableDomain(stack, parameterMap, context.api.apiId, nodeToNodeEncryption);

    const openSearchRole = createSearchableDomainRole(context, stack, parameterMap);

    domain.grantReadWrite(openSearchRole);

    const { region } = stack.splitArn(domain.domainArn, ArnFormat.SLASH_RESOURCE_NAME);
    if (!region) {
      throw new Error('Could not access region from search domain');
    }

    const datasource = createSearchableDataSource(
      stack,
      context.api,
      domain.domainEndpoint,
      openSearchRole,
      region,
    );

    // streaming lambda role
    const lambdaRole = createLambdaRole(context, stack, parameterMap);
    domain.grantWrite(lambdaRole);

    // creates streaming lambda
    const lambda = createLambda(
      stack,
      context.api,
      parameterMap,
      lambdaRole,
      domain.domainEndpoint,
      isProjectUsingDataStore,
      region,
    );

    for (const def of this.searchableObjectTypeDefinitions) {
      const type = def.node.name.value;
      const openSearchIndexName = context.resourceHelper.getModelNameMapping(type);
      const fields = def.node.fields?.map((f) => f.name.value) ?? [];
      const typeName = context.output.getQueryTypeName();
      const table = getTable(context, def.node);
      const ddbTable = table as Table;
      if (!ddbTable) {
        throw new Error('Failed to find ddb table for searchable');
      }

      ddbTable.grantStreamRead(lambdaRole);

      // creates event source mapping from ddb to lambda
      if (!ddbTable.tableStreamArn) {
        throw new Error('tableStreamArn is required on ddb table ot create event source mappings');
      }
      createEventSourceMapping(stack, openSearchIndexName, lambda, parameterMap, ddbTable.tableStreamArn);

      const { attributeName } = (table as any).keySchema.find((att: any) => att.keyType === 'HASH');
      const keyFields = getKeyFields(attributeName, table);

      if (!typeName) {
        throw new Error('Query type name not found');
      }
      const resolver = context.resolvers.generateQueryResolver(
        typeName,
        def.fieldName,
        ResolverResourceIDs.ElasticsearchSearchResolverResourceID(type),
        datasource as DataSourceProvider,
        MappingTemplate.s3MappingTemplateFromString(
          requestTemplate(
            attributeName,
            getNonKeywordFields((context.output.getObject(type))as ObjectTypeDefinitionNode),
            context.isProjectUsingDataStore(),
            openSearchIndexName,
            keyFields,
          ),
          `${typeName}.${def.fieldName}.req.vtl`,
        ),
        MappingTemplate.s3MappingTemplateFromString(
          responseTemplate(context.isProjectUsingDataStore()),
          `${typeName}.${def.fieldName}.res.vtl`,
        ),
      );
      resolver.addToSlot(
        'postAuth',
        MappingTemplate.s3MappingTemplateFromString(
          sandboxMappingTemplate(context.sandboxModeEnabled, fields),
          `${typeName}.${def.fieldName}.{slotName}.{slotIndex}.res.vtl`,
        ),
      );

      resolver.mapToStack(stack);
      context.resolvers.addResolver(typeName, def.fieldName, resolver);
    }

    createStackOutputs(stack, domain.domainEndpoint, context.api.apiId, domain.domainArn);
  };

  object = (definition: ObjectTypeDefinitionNode, directive: DirectiveNode, ctx: TransformerSchemaVisitStepContextProvider): void => {
    const modelDirective = definition?.directives?.find((dir) => dir.name.value === 'model');
    const hasAuth = definition.directives?.some((dir) => dir.name.value === 'auth') ?? false;
    if (!modelDirective) {
      throw new InvalidDirectiveError('Types annotated with @searchable must also be annotated with @model.');
    }

    const directiveWrapped = new DirectiveWrapper(directive);
    const directiveArguments = directiveWrapped.getArguments({}, generateGetArgumentsInput(ctx.featureFlags)) as any;
    let shouldMakeSearch = true;
    let searchFieldNameOverride;

    if (directiveArguments.queries) {
      if (!directiveArguments.queries.search) {
        shouldMakeSearch = false;
      } else {
        searchFieldNameOverride = directiveArguments.queries.search;
      }
    }
    const fieldName = searchFieldNameOverride ?? graphqlName(`search${plurality(toUpper(definition.name.value), true)}`);
    this.searchableObjectTypeDefinitions.push({
      node: definition,
      fieldName,
    });

    if (shouldMakeSearch) {
      this.searchableObjectNames.push(definition.name.value);
      generateSearchableXConnectionType(ctx, definition);
      generateSearchableAggregateTypes(ctx);
      const directives = [];
      if (!hasAuth && ctx.sandboxModeEnabled && ctx.authConfig.defaultAuthentication.authenticationType !== 'API_KEY') {
        directives.push(makeDirective('aws_api_key', []));
      }
      const queryField = makeField(
        fieldName,
        [
          makeInputValueDefinition('filter', makeNamedType(`Searchable${definition.name.value}FilterInput`)),
          makeInputValueDefinition('sort', makeListType(makeNamedType(`Searchable${definition.name.value}SortInput`))),
          makeInputValueDefinition('limit', makeNamedType('Int')),
          makeInputValueDefinition('nextToken', makeNamedType('String')),
          makeInputValueDefinition('from', makeNamedType('Int')),
          makeInputValueDefinition('aggregates', makeListType(makeNamedType(`Searchable${definition.name.value}AggregationInput`))),
        ],
        makeNamedType(`Searchable${definition.name.value}Connection`),
        directives,
      );
      ctx.output.addQueryFields([queryField]);
    }
  };

  prepare = (ctx: TransformerPrepareStepContextProvider): void => {
    // register search query resolvers in field mapping
    // if no mappings are registered elsewhere, this won't do anything
    // but if mappings are defined this will ensure the mapping is also applied to the search results
    for (const def of this.searchableObjectTypeDefinitions) {
      const modelName = def.node.name.value;
      ctx.resourceHelper.getModelFieldMap(modelName).addResolverReference({ typeName: 'Query', fieldName: def.fieldName, isList: true });
    }
  };

  transformSchema = (ctx: TransformerTransformSchemaStepContextProvider): void => {
    for (const name of this.searchableObjectNames) {
      const searchObject = ctx.output.getObject(name) as ObjectTypeDefinitionNode;
      generateSearchableInputs(ctx, searchObject);
    }
    // add api key to aggregate types if sandbox mode is enabled
    if (ctx.sandboxModeEnabled && ctx.authConfig.defaultAuthentication.authenticationType !== 'API_KEY') {
      for (const aggType of AGGREGATE_TYPES) {
        const aggObject = ctx.output.getObject(aggType)!;
        const hasApiKey = aggObject.directives?.some((dir) => dir.name.value === 'aws_api_key') ?? false;
        if (!hasApiKey) {
          extendTypeWithDirectives(ctx, aggType, [makeDirective('aws_api_key', [])]);
        }
      }
    }
  };
}
