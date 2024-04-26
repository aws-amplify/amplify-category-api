import {
  DDB_DEFAULT_DATASOURCE_STRATEGY,
  DirectiveWrapper,
  InvalidDirectiveError,
  TransformerPluginBase,
  generateGetArgumentsInput,
  getModelDataSourceNameForTypeName,
  getModelDataSourceStrategy,
  isAmplifyDynamoDbModelDataSourceStrategy,
  isDefaultDynamoDbModelDataSourceStrategy,
  isSqlModel,
} from '@aws-amplify/graphql-transformer-core';
import {
  FieldMapEntry,
  TransformerAuthProvider,
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
  TransformerValidationStepContextProvider,
  TransformerPreProcessContextProvider,
  DataSourceStrategiesProvider,
  ModelDataSourceStrategy,
} from '@aws-amplify/graphql-transformer-interfaces';
import { ManyToManyDirective } from '@aws-amplify/graphql-directives';
import {
  DirectiveNode,
  DocumentNode,
  FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
} from 'graphql';
import {
  blankObject,
  getBaseType,
  graphqlName,
  isListType,
  makeArgument,
  makeDirective,
  makeField,
  makeNamedType,
  makeValueNode,
  toUpper,
  wrapNonNull,
} from 'graphql-transformer-common';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { IndexTransformer } from '@aws-amplify/graphql-index-transformer';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/types/types-external';
import { ManyToManyDirectiveConfiguration, ManyToManyPreProcessContext, ManyToManyRelation } from './types';
import {
  getManyToManyConnectionAttributeName,
  getObjectPrimaryKey,
  registerManyToManyForeignKeyMappings,
  validateModelDirective,
} from './utils';
import { updateTableForConnection } from './resolvers';
import {
  ensureHasManyConnectionField,
  extendTypeWithConnection,
  getPartitionKeyField,
  getPartitionKeyFieldNoContext,
  getSortKeyFields,
  getSortKeyFieldsNoContext,
} from './schema';
import { HasOneTransformer } from './graphql-has-one-transformer';
import { DDBRelationalResolverGenerator } from './resolver/ddb-generator';

/**
 * ManyToManyTransformer
 * The many to many transformer is shorthand for an additional model in the a GraphQL schema,
 * the directive is used to create the additional model based on the relationName in addition to
 * the necessary index and relational hasOne/hasMany directives to establish a M:N relationship between
 * two model types
 */
export class ManyToManyTransformer extends TransformerPluginBase {
  private relationMap = new Map<string, ManyToManyRelation>();

  private directiveList: ManyToManyDirectiveConfiguration[] = [];

  private modelTransformer: ModelTransformer;

  private indexTransformer: IndexTransformer;

  private hasOneTransformer: HasOneTransformer;

  private authProvider: TransformerAuthProvider;

  constructor(
    modelTransformer: ModelTransformer,
    indexTransformer: IndexTransformer,
    hasOneTransformer: HasOneTransformer,
    authProvider: TransformerAuthProvider,
  ) {
    super('amplify-many-to-many-transformer', ManyToManyDirective.definition);
    this.modelTransformer = modelTransformer;
    this.indexTransformer = indexTransformer;
    this.hasOneTransformer = hasOneTransformer;
    this.authProvider = authProvider;
  }

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    context: TransformerSchemaVisitStepContextProvider,
  ): void => {
    const directiveWrapped = new DirectiveWrapper(directive);
    const args = directiveWrapped.getArguments(
      {
        directiveName: ManyToManyDirective.name,
        object: parent as ObjectTypeDefinitionNode,
        field: definition,
        directive,
        limit: ManyToManyDirective.defaults.limit,
      } as ManyToManyDirectiveConfiguration,
      generateGetArgumentsInput(context.transformParameters),
    );

    validateModelDirective(args);
    args.connectionFields = [];

    if (!isListType(definition.type)) {
      throw new InvalidDirectiveError(`@${ManyToManyDirective.name} must be used with a list.`);
    }

    addDirectiveToRelationMap(this.relationMap, args);
    this.directiveList.push(args);

    this.relationMap.forEach((manyToManyRelation, _) => addJoinTableToDatasourceStrategies(context, manyToManyRelation));
  };

  /** During the preProcess step, modify the document node and return it
   * so that it represents any schema modifications the plugin needs
   */
  mutateSchema = (context: TransformerPreProcessContextProvider): DocumentNode => {
    // Relation name is the key, each array should be length 2 (two models being connected)
    const manyToManyMap = new Map<string, ManyToManyPreProcessContext[]>();
    const newDocument: DocumentNode = produce(context.inputDocument, (draftDoc) => {
      const filteredDefs = draftDoc?.definitions?.filter(
        (def) => def.kind === 'ObjectTypeExtension' || def.kind === 'ObjectTypeDefinition',
      );
      const objectDefs = filteredDefs as Array<WritableDraft<ObjectTypeDefinitionNode | ObjectTypeExtensionNode>>;
      // First iteration builds the map
      objectDefs?.forEach((def) => {
        def?.fields?.forEach((field) => {
          field?.directives
            ?.filter((dir) => dir.name.value === ManyToManyDirective.name)
            ?.forEach((dir) => {
              const relationArg = dir?.arguments?.find((arg) => arg.name.value === 'relationName');
              if (relationArg?.value?.kind === 'StringValue') {
                const relationName = relationArg.value.value;
                const manyToManyContext: ManyToManyPreProcessContext = {
                  model: def,
                  field,
                  directive: dir,
                  modelAuthDirectives: def?.directives?.filter((authDir) => authDir.name.value === 'auth') ?? [],
                  fieldAuthDirectives: def?.directives?.filter((authDir) => authDir.name.value === 'auth') ?? [],
                  relationName,
                };
                if (!manyToManyMap.has(relationName)) {
                  manyToManyMap.set(relationName, []);
                }
                manyToManyMap.get(relationName)?.push(manyToManyContext);
              }
            });
        });
      });

      // Run check for relations that are not binary and therefore invalid
      manyToManyMap.forEach((value, key) => {
        if (value.length !== 2) {
          throw new InvalidDirectiveError(`relationNames should have 2 occurrences. '${key}' has '${value.length}' occurrences`);
        }
      });

      manyToManyMap.forEach((value, key) => {
        // Determine primary key on each model
        const manyToManyOne = value[0];
        const manyToManyTwo = value[1];
        const d1origTypeName = context.schemaHelper.getTypeMapping(manyToManyOne.model.name.value);
        const d2origTypeName = context.schemaHelper.getTypeMapping(manyToManyTwo.model.name.value);
        const d1TypeName = manyToManyOne.model.name.value;
        const d2TypeName = manyToManyTwo.model.name.value;
        const d1FieldName = d1TypeName.charAt(0).toLowerCase() + d1TypeName.slice(1);
        const d2FieldName = d2TypeName.charAt(0).toLowerCase() + d2TypeName.slice(1);
        const d1FieldNameOrig = d1origTypeName.charAt(0).toLowerCase() + d1origTypeName.slice(1);
        const d2FieldNameOrig = d2origTypeName.charAt(0).toLowerCase() + d2origTypeName.slice(1);
        const d1PartitionKey = getPartitionKeyFieldNoContext(manyToManyOne.model);
        const d1SortKeys = getSortKeyFieldsNoContext(manyToManyOne.model);
        const d2PartitionKey = getPartitionKeyFieldNoContext(manyToManyTwo.model);
        const d2SortKeys = getSortKeyFieldsNoContext(manyToManyTwo.model);
        const d1IndexName = `by${d1origTypeName}`;
        const d2IndexName = `by${d2origTypeName}`;
        const d1FieldNameId = getManyToManyConnectionAttributeName(
          context.transformParameters,
          d1FieldName,
          getObjectPrimaryKey(manyToManyOne.model as ObjectTypeDefinitionNode).name.value,
        );
        const d1SortFieldNames = d1SortKeys.map((node) => `${d1FieldNameOrig}${node.name.value}`);
        const d2FieldNameId = getManyToManyConnectionAttributeName(
          context.transformParameters,
          d2FieldName,
          getObjectPrimaryKey(manyToManyTwo.model as ObjectTypeDefinitionNode).name.value,
        );
        const d2SortFieldNames = d2SortKeys.map((node) => `${d2FieldNameOrig}${node.name.value}`);
        const joinModelDirective = makeDirective('model', []);
        const d1IndexDirective = makeDirective('index', [
          makeArgument('name', makeValueNode(d1IndexName)),
          makeArgument('sortKeyFields', makeValueNode([...d1SortFieldNames])),
        ]);
        const d2IndexDirective = makeDirective('index', [
          makeArgument('name', makeValueNode(d2IndexName)),
          makeArgument('sortKeyFields', makeValueNode([...d2SortFieldNames])),
        ]);
        const d1HasOneDirective = makeDirective('hasOne', [makeArgument('fields', makeValueNode([d1FieldNameId, ...d1SortFieldNames]))]);
        const d2HasOneDirective = makeDirective('hasOne', [makeArgument('fields', makeValueNode([d2FieldNameId, ...d2SortFieldNames]))]);
        const d1RelatedField = makeField(d1FieldNameId, [], wrapNonNull(makeNamedType(getBaseType(d1PartitionKey.type))), [
          d1IndexDirective,
        ]);
        const d1RelatedSortKeyFields = d1SortKeys.map((node) =>
          makeField(`${d1FieldName}${node.name.value}`, [], wrapNonNull(makeNamedType(getBaseType(node.type)))),
        );
        const d2RelatedField = makeField(d2FieldNameId, [], wrapNonNull(makeNamedType(getBaseType(d2PartitionKey.type))), [
          d2IndexDirective,
        ]);
        const d2RelatedSortKeyFields = d2SortKeys.map((node) =>
          makeField(`${d2FieldName}${node.name.value}`, [], wrapNonNull(makeNamedType(getBaseType(node.type)))),
        );
        const d1Field = makeField(d1FieldName, [], wrapNonNull(makeNamedType(d1TypeName)), [d1HasOneDirective]);
        const d2Field = makeField(d2FieldName, [], wrapNonNull(makeNamedType(d2TypeName)), [d2HasOneDirective]);
        const joinTableDirectives = [joinModelDirective];
        const joinTableAuthDirective = createJoinTableAuthDirective(manyToManyOne.model, manyToManyTwo.model);

        if (joinTableAuthDirective) {
          joinTableDirectives.push(joinTableAuthDirective);
        }

        const joinType = {
          ...blankObject(manyToManyOne.relationName),
          fields: [
            makeField('id', [], wrapNonNull(makeNamedType('ID'))),
            d1RelatedField,
            ...d1RelatedSortKeyFields,
            d2RelatedField,
            ...d2RelatedSortKeyFields,
            d1Field,
            d2Field,
          ],
          directives: joinTableDirectives,
        };

        const d1SortKeyNames = d1SortKeys.map((field) => field.name.value);
        const d2SortKeyNames = d2SortKeys.map((field) => field.name.value);

        const hasManyOne = makeDirective('hasMany', [
          makeArgument('indexName', makeValueNode(d1IndexName)),
          makeArgument('fields', makeValueNode([d1PartitionKey.name.value, ...d1SortKeyNames])),
        ]);
        const hasManyTwo = makeDirective('hasMany', [
          makeArgument('indexName', makeValueNode(d2IndexName)),
          makeArgument('fields', makeValueNode([d2PartitionKey.name.value, ...d2SortKeyNames])),
        ]);

        manyToManyOne?.field?.directives?.push(hasManyOne as WritableDraft<DirectiveNode>);
        manyToManyTwo?.field?.directives?.push(hasManyTwo as WritableDraft<DirectiveNode>);

        let baseTypeD1 = manyToManyOne.field.type;
        let baseTypeD2 = manyToManyOne.field.type;
        while (baseTypeD1.kind !== 'NamedType') {
          baseTypeD1 = baseTypeD1.type;
        }
        while (baseTypeD2.kind !== 'NamedType') {
          baseTypeD2 = baseTypeD2.type;
        }
        baseTypeD1.name.value = manyToManyOne.relationName;
        baseTypeD2.name.value = manyToManyTwo.relationName;

        draftDoc.definitions.push(joinType as WritableDraft<ObjectTypeDefinitionNode>);
      });
    });
    return newDocument;
  };

  validate = (ctx: TransformerValidationStepContextProvider): void => {
    this.relationMap.forEach((relation) => {
      const { directive1, directive2, name } = relation;

      if (!directive2) {
        throw new InvalidDirectiveError(`@${ManyToManyDirective.name} relation '${name}' must be used in exactly two locations.`);
      }

      const d1ExpectedType = getBaseType(directive1.field.type);
      const d2ExpectedType = getBaseType(directive2.field.type);

      if (isSqlModel(ctx, d1ExpectedType) || isSqlModel(ctx, d2ExpectedType)) {
        throw new InvalidDirectiveError(`@${ManyToManyDirective.name} directive cannot be used on a SQL model.`);
      }

      const d1Strategy = getModelDataSourceStrategy(ctx, d1ExpectedType);
      const d2Strategy = getModelDataSourceStrategy(ctx, d2ExpectedType);
      if (
        (isDefaultDynamoDbModelDataSourceStrategy(d1Strategy) && !isDefaultDynamoDbModelDataSourceStrategy(d2Strategy)) ||
        (isAmplifyDynamoDbModelDataSourceStrategy(d1Strategy) && !isAmplifyDynamoDbModelDataSourceStrategy(d2Strategy))
      ) {
        throw new InvalidDirectiveError(
          `@${ManyToManyDirective.name} directive cannot be used to relate models with a different DynamoDB-based strategies.`,
        );
      }

      if (d1ExpectedType !== directive2.object.name.value) {
        throw new InvalidDirectiveError(
          `@${ManyToManyDirective.name} relation '${name}' expects '${d1ExpectedType}' but got '${directive2.object.name.value}'.`,
        );
      }

      if (d2ExpectedType !== directive1.object.name.value) {
        throw new InvalidDirectiveError(
          `@${ManyToManyDirective.name} relation '${name}' expects '${d2ExpectedType}' but got '${directive1.object.name.value}'.`,
        );
      }

      if (ctx.output.hasType(name)) {
        throw new InvalidDirectiveError(
          `@${ManyToManyDirective.name} relation name '${name}' (derived from '${directive1.relationName}') already exists as a type in the schema.`,
        );
      }
    });
  };

  prepare = (ctx: TransformerPrepareStepContextProvider): void => {
    // The @manyToMany directive creates a join table, injects it into the existing transformer, and then functions like one to many.
    const context = ctx as TransformerContextProvider;
    if (!ctx.metadata.has('joinTypeList')) {
      ctx.metadata.set('joinTypeList', []);
    }

    // variables with 'orig' in their name in this loop refer to their original value as specified by the @mapsTo directive
    // this code desperately needs to be refactored to reduce the duplication
    this.relationMap.forEach((relation) => {
      const { directive1, directive2, name } = relation;
      ctx.metadata.get<Array<string>>('joinTypeList')!.push(name);
      const d1origTypeName = ctx.resourceHelper.getModelNameMapping(directive1.object.name.value);
      const d2origTypeName = ctx.resourceHelper.getModelNameMapping(directive2.object.name.value);
      const d1TypeName = directive1.object.name.value;
      const d2TypeName = directive2.object.name.value;
      const d1FieldName = d1TypeName.charAt(0).toLowerCase() + d1TypeName.slice(1);
      const d2FieldName = d2TypeName.charAt(0).toLowerCase() + d2TypeName.slice(1);
      const d1FieldNameOrig = d1origTypeName.charAt(0).toLowerCase() + d1origTypeName.slice(1);
      const d2FieldNameOrig = d2origTypeName.charAt(0).toLowerCase() + d2origTypeName.slice(1);
      const d1PartitionKey = getPartitionKeyField(context, directive1.object);
      const d1SortKeys = getSortKeyFields(context, directive1.object);
      const d2PartitionKey = getPartitionKeyField(context, directive2.object);
      const d2SortKeys = getSortKeyFields(context, directive2.object);
      const d1IndexName = `by${d1origTypeName}`;
      const d2IndexName = `by${d2origTypeName}`;
      const d1FieldNameId = getManyToManyConnectionAttributeName(
        ctx.transformParameters,
        d1FieldName,
        getObjectPrimaryKey(directive1.object).name.value,
      );
      const d1SortFieldNames = d1SortKeys.map((node) => `${d1FieldNameOrig}${node.name.value}`);
      const d2FieldNameId = getManyToManyConnectionAttributeName(
        ctx.transformParameters,
        d2FieldName,
        getObjectPrimaryKey(directive2.object).name.value,
      );
      const d1FieldNameIdOrig = getManyToManyConnectionAttributeName(
        ctx.transformParameters,
        d1FieldNameOrig,
        getObjectPrimaryKey(directive1.object).name.value,
      );
      const d2FieldNameIdOrig = getManyToManyConnectionAttributeName(
        ctx.transformParameters,
        d2FieldNameOrig,
        getObjectPrimaryKey(directive2.object).name.value,
      );
      const d2SortFieldNames = d2SortKeys.map((node) => `${d2FieldNameOrig}${node.name.value}`);
      const joinModelDirective = makeDirective('model', []);
      const d1IndexDirective = makeDirective('index', [
        makeArgument('name', makeValueNode(d1IndexName)),
        makeArgument('sortKeyFields', makeValueNode([...d1SortFieldNames])),
      ]);
      const d2IndexDirective = makeDirective('index', [
        makeArgument('name', makeValueNode(d2IndexName)),
        makeArgument('sortKeyFields', makeValueNode([...d2SortFieldNames])),
      ]);
      const d1HasOneDirective = makeDirective('hasOne', [makeArgument('fields', makeValueNode([d1FieldNameId, ...d1SortFieldNames]))]);
      const d2HasOneDirective = makeDirective('hasOne', [makeArgument('fields', makeValueNode([d2FieldNameId, ...d2SortFieldNames]))]);
      const d1RelatedField = makeField(d1FieldNameId, [], wrapNonNull(makeNamedType(getBaseType(d1PartitionKey.type))), [d1IndexDirective]);
      const d1RelatedSortKeyFields = d1SortKeys.map((node) =>
        makeField(`${d1FieldName}${node.name.value}`, [], wrapNonNull(makeNamedType(getBaseType(node.type)))),
      );
      const d2RelatedField = makeField(d2FieldNameId, [], wrapNonNull(makeNamedType(getBaseType(d2PartitionKey.type))), [d2IndexDirective]);
      const d2RelatedSortKeyFields = d2SortKeys.map((node) =>
        makeField(`${d2FieldName}${node.name.value}`, [], wrapNonNull(makeNamedType(getBaseType(node.type)))),
      );
      const d1Field = makeField(d1FieldName, [], wrapNonNull(makeNamedType(d1TypeName)), [d1HasOneDirective]);
      const d2Field = makeField(d2FieldName, [], wrapNonNull(makeNamedType(d2TypeName)), [d2HasOneDirective]);
      const joinTableDirectives = [joinModelDirective];
      const joinTableAuthDirective = createJoinTableAuthDirective(directive1.object, directive2.object);

      if (joinTableAuthDirective) {
        joinTableDirectives.push(joinTableAuthDirective);
      }

      const joinType = {
        ...blankObject(name),
        fields: [
          makeField('id', [], wrapNonNull(makeNamedType('ID'))),
          d1RelatedField,
          ...d1RelatedSortKeyFields,
          d2RelatedField,
          ...d2RelatedSortKeyFields,
          d1Field,
          d2Field,
        ],
        directives: joinTableDirectives,
      };

      ctx.output.addObject(joinType);

      directive1.indexName = d1IndexName;
      directive2.indexName = d2IndexName;
      directive1.fields = [d1PartitionKey.name.value, ...d1SortKeys.map((node) => `${node.name.value}`)];
      directive2.fields = [d2PartitionKey.name.value, ...d2SortKeys.map((node) => `${node.name.value}`)];
      directive1.fieldNodes = [d1PartitionKey, ...d1SortKeys];
      directive2.fieldNodes = [d2PartitionKey, ...d2SortKeys];
      directive1.relatedType = joinType;
      directive2.relatedType = joinType;
      directive1.relatedTypeIndex = [d1RelatedField];
      directive2.relatedTypeIndex = [d2RelatedField];

      this.modelTransformer.object(joinType, joinModelDirective, context);
      this.hasOneTransformer.field(joinType, d1Field, d1HasOneDirective, context);
      this.hasOneTransformer.field(joinType, d2Field, d2HasOneDirective, context);

      if (joinTableAuthDirective) {
        this.authProvider.object!(joinType, joinTableAuthDirective, context);
      }

      // because of @mapsTo, we need to create a joinType object that matches the original before calling the indexTransformer.
      // this ensures that the GSIs on the existing join table stay the same
      const d1IndexDirectiveOrig = makeDirective('index', [
        makeArgument('name', makeValueNode(d1IndexName)),
        makeArgument('sortKeyFields', makeValueNode([...d1SortFieldNames])),
      ]);
      const d2IndexDirectiveOrig = makeDirective('index', [
        makeArgument('name', makeValueNode(d2IndexName)),
        makeArgument('sortKeyFields', makeValueNode([...d2SortFieldNames])),
      ]);

      const d1RelatedFieldOrig = makeField(d1FieldNameIdOrig, [], wrapNonNull(makeNamedType(getBaseType(d1PartitionKey.type))), [
        d1IndexDirectiveOrig,
      ]);
      const d2RelatedFieldOrig = makeField(d2FieldNameIdOrig, [], wrapNonNull(makeNamedType(getBaseType(d2PartitionKey.type))), [
        d2IndexDirectiveOrig,
      ]);
      const joinTypeOrig = {
        ...blankObject(name),
        fields: [
          makeField('id', [], wrapNonNull(makeNamedType('ID'))),
          d1RelatedFieldOrig,
          ...d1RelatedSortKeyFields,
          d2RelatedFieldOrig,
          ...d2RelatedSortKeyFields,
          d1Field,
          d2Field,
        ],
        directives: joinTableDirectives,
      };
      this.indexTransformer.field(joinTypeOrig, d1RelatedFieldOrig, d1IndexDirectiveOrig, context);
      this.indexTransformer.field(joinTypeOrig, d2RelatedFieldOrig, d2IndexDirectiveOrig, context);

      // if either side of the many-to-many connection is renamed, the foreign key fields of the join table need to be remapped
      const renamedFields: FieldMapEntry[] = [];
      if (ctx.resourceHelper.isModelRenamed(directive1.object.name.value)) {
        renamedFields.push({ originalFieldName: d1FieldNameIdOrig, currentFieldName: d1FieldNameId });
      }
      if (ctx.resourceHelper.isModelRenamed(directive2.object.name.value)) {
        renamedFields.push({ originalFieldName: d2FieldNameIdOrig, currentFieldName: d2FieldNameId });
      }

      if (renamedFields.length && !isSqlModel(context as TransformerContextProvider, name)) {
        registerManyToManyForeignKeyMappings({
          resourceHelper: ctx.resourceHelper,
          typeName: name,
          referencedBy: [
            { typeName: directive1.object.name.value, fieldName: directive1.field.name.value, isList: true },
            { typeName: directive2.object.name.value, fieldName: directive2.field.name.value, isList: true },
          ],
          fieldMap: renamedFields,
        });
      }

      context.providerRegistry.registerDataSourceProvider(joinType, this.modelTransformer);
    });
  };

  transformSchema = (ctx: TransformerTransformSchemaStepContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      ensureHasManyConnectionField(config, context);
      extendTypeWithConnection(config, context);
    }
  };

  generateResolvers = (ctx: TransformerContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      updateTableForConnection(config, context);
      new DDBRelationalResolverGenerator().makeHasManyGetItemsConnectionWithKeyResolver(config, context);
    }
  };
}

/**
 * Adds the join table created by the transformer to the context's `dataSourceStrategies`. NOTE: This is the only place in the transformer
 * chain where we use a default value for the ModelDataSourceStrategy. All other models must be explicitly set by the caller in the
 * transformer context, but the many to many join table will always be created using the DynamoDB default provisioning strategy.
 */
const addJoinTableToDatasourceStrategies = (ctx: DataSourceStrategiesProvider, manyToManyRelation: ManyToManyRelation): void => {
  // We enforce elsewhere that both sides of the many to many relationship must share the same strategy. We'll use that strategy here for
  // the join table
  const {
    name: relationName,
    directive1: {
      object: {
        name: { value: typeName },
      },
    },
  } = manyToManyRelation;
  const parentStrategy = getModelDataSourceStrategy(ctx, typeName);
  ctx.dataSourceStrategies[relationName] = parentStrategy;
};

// eslint-disable-next-line func-style, prefer-arrow/prefer-arrow-functions
function addDirectiveToRelationMap(map: Map<string, ManyToManyRelation>, directive: ManyToManyDirectiveConfiguration): void {
  const { relationName } = directive;
  const gqlName = getGraphqlRelationName(relationName);
  let relation;

  relation = map.get(gqlName);

  if (relation === undefined) {
    relation = { name: gqlName, directive1: directive };
    map.set(gqlName, relation as ManyToManyRelation);
    return;
  }

  if (relation.directive2) {
    throw new InvalidDirectiveError(`@${ManyToManyDirective.name} relation '${relationName}' must be used in exactly two locations.`);
  }

  relation.directive2 = directive;
}

// eslint-disable-next-line func-style, prefer-arrow/prefer-arrow-functions
function getGraphqlRelationName(name: string): string {
  return graphqlName(toUpper(name));
}

// eslint-disable-next-line func-style, prefer-arrow/prefer-arrow-functions, @typescript-eslint/explicit-function-return-type
function createJoinTableAuthDirective(
  table1: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
  table2: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
) {
  const t1Auth = table1.directives!.find((directive) => directive.name.value === 'auth');
  const t2Auth = table2.directives!.find((directive) => directive.name.value === 'auth');
  const t1Rules = ((t1Auth?.arguments ?? []).find((arg) => arg.name.value === 'rules')?.value as any)?.values ?? [];
  const t2Rules = ((t2Auth?.arguments ?? []).find((arg) => arg.name.value === 'rules')?.value as any)?.values ?? [];
  const rules = [...t1Rules, ...t2Rules];

  if (rules.length === 0) {
    return;
  }

  // eslint-disable-next-line consistent-return
  return makeDirective('auth', [makeArgument('rules', { kind: Kind.LIST, values: rules })]);
}
