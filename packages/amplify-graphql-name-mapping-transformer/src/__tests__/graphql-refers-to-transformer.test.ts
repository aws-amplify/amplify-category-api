import { DirectiveNode, FieldDefinitionNode, Kind, ObjectTypeDefinitionNode, parse } from 'graphql';
import {
  SQLLambdaModelDataSourceStrategy,
  TransformerContextProvider,
  TransformerPreProcessContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DDB_DEFAULT_DATASOURCE_STRATEGY, MYSQL_DB_TYPE, constructDataSourceStrategies } from '@aws-amplify/graphql-transformer-core';
import { RefersToTransformer } from '../graphql-refers-to-transformer';
import { attachFieldMappingSlot } from '../field-mapping-resolvers';

jest.mock('../field-mapping-resolvers');

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

const refersToTransformer = new RefersToTransformer();

const mySqlStrategy: SQLLambdaModelDataSourceStrategy = {
  name: 'mySqlStrategy',
  dbType: MYSQL_DB_TYPE,
  dbConnectionConfig: {
    databaseNameSsmPath: '/databaseNameSsmPath',
    hostnameSsmPath: '/hostnameSsmPath',
    passwordSsmPath: '/passwordSsmPath',
    portSsmPath: '/portSsmPath',
    usernameSsmPath: '/usernameSsmPath',
  },
};

describe('@refersTo directive on models', () => {
  const setModelNameMapping_mock = jest.fn();
  const getResolver_mock = jest.fn();
  const getModelFieldMapKeys_mock = jest.fn();
  const getModelFieldMap_mock = jest.fn();
  const setTypeMapping_mock = jest.fn();

  const hostStub = 'host_stub';

  const stubTransformerContextBase = {
    resolvers: {
      getResolver: getResolver_mock,
    },
    resourceHelper: {
      setModelNameMapping: setModelNameMapping_mock,
      getModelFieldMapKeys: getModelFieldMapKeys_mock,
      getModelFieldMap: getModelFieldMap_mock,
    },
    api: {
      host: hostStub,
    },
    schemaHelper: {
      setTypeMapping: setTypeMapping_mock,
    },
  };

  const modelName = 'TestName';

  const simpleSchema = /* GraphQL */ `
    type ${modelName} @model @refersTo(name: "OriginalName") {
      id: ID!
    }
  `;

  const conflictingModelSchema = /* GraphQL */ `
    type ${modelName} @model @refersTo(name: "OriginalName") {
      id: ID!
    }

    type OriginalName @model {
      id: ID!
    }
  `;

  const duplicateNameMappingModelSchema = /* GraphQL */ `
    type ${modelName} @model @refersTo(name: "OriginalName") {
      id: ID!
    }

    type DuplicateName @model @refersTo(name: "OriginalName") {
      id: ID!
    }
  `;

  const getTransformerInputsFromSchema = (schema: string, modelName: string) => {
    const ast = parse(schema);
    const stubDefinition = ast.definitions.find(
      (def) => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === modelName,
    ) as ObjectTypeDefinitionNode;
    const stubDirective = stubDefinition.directives?.find((directive) => directive.name.value === 'refersTo')!;
    return [
      stubDefinition as DeepWriteable<ObjectTypeDefinitionNode>,
      stubDirective as DeepWriteable<DirectiveNode>,
      {
        ...stubTransformerContextBase,
        inputDocument: ast,
        dataSourceStrategies: constructDataSourceStrategies(schema, mySqlStrategy),
      } as unknown as TransformerSchemaVisitStepContextProvider,
    ] as const;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can be applied only on model types', () => {
    const schema = /* GraphQL */ `
      type TestName @refersTo(name: "OriginalName") {
        id: ID!
      }
    `;
    const [stubDefinition, stubDirective, stubTransformerContext] = getTransformerInputsFromSchema(schema, modelName);
    stubDirective.arguments = [];
    expect(() =>
      refersToTransformer.object(stubDefinition as ObjectTypeDefinitionNode, stubDirective as DirectiveNode, stubTransformerContext),
    ).toThrowErrorMatchingInlineSnapshot('"@refersTo is not supported on type TestName. It can only be used on a @model type."');
  });

  it('can be applied only on RDS models', () => {
    const schema = /* GraphQL */ `
      type DDBModel @refersTo(name: "OriginalName") @model {
        id: ID!
      }
    `;
    const [stubDefinition, stubDirective, stubTransformerContext] = getTransformerInputsFromSchema(schema, 'DDBModel');
    stubTransformerContext.dataSourceStrategies.DDBModel = DDB_DEFAULT_DATASOURCE_STRATEGY;
    stubDirective.arguments = [];
    expect(() =>
      refersToTransformer.object(stubDefinition as ObjectTypeDefinitionNode, stubDirective as DirectiveNode, stubTransformerContext),
    ).toThrowErrorMatchingInlineSnapshot(`"@refersTo is only supported on SQL models. DDBModel is not a SQL model."`);
  });

  it('requires a name to be specified', () => {
    const [stubDefinition, stubDirective, stubTransformerContext] = getTransformerInputsFromSchema(simpleSchema, modelName);
    stubDirective.arguments = [];
    expect(() =>
      refersToTransformer.object(stubDefinition as ObjectTypeDefinitionNode, stubDirective as DirectiveNode, stubTransformerContext),
    ).toThrowErrorMatchingInlineSnapshot('"name is required in @refersTo directive."');
  });

  it('requires a string value for name', () => {
    const [stubDefinition, stubDirective, stubTransformerContext] = getTransformerInputsFromSchema(simpleSchema, modelName);
    stubDirective.arguments![0].value.kind = 'ListValue';
    expect(() =>
      refersToTransformer.object(stubDefinition as ObjectTypeDefinitionNode, stubDirective as DirectiveNode, stubTransformerContext),
    ).toThrowErrorMatchingInlineSnapshot('"A single string must be provided for \\"name\\" in @refersTo directive"');
  });

  it('registers the rename mapping', () => {
    const [stubDefinition, stubDirective, stubTransformerContext] = getTransformerInputsFromSchema(simpleSchema, modelName);
    refersToTransformer.object(stubDefinition as ObjectTypeDefinitionNode, stubDirective as DirectiveNode, stubTransformerContext);
    expect(setModelNameMapping_mock.mock.calls[0]).toEqual(['TestName', 'OriginalName']);
  });

  it('throws if a conflicting model name is present in the schema', () => {
    const [stubDefinition, stubDirective, stubTransformerContext] = getTransformerInputsFromSchema(conflictingModelSchema, modelName);
    expect(() =>
      refersToTransformer.object(stubDefinition as ObjectTypeDefinitionNode, stubDirective as DirectiveNode, stubTransformerContext),
    ).toThrowErrorMatchingInlineSnapshot(
      '"Cannot apply @refersTo with name \\"OriginalName\\" on type \\"TestName\\" because \\"OriginalName\\" model already exists in the schema."',
    );
  });

  it('throws if a model name mapping is duplicate', () => {
    const [stubDefinition, stubDirective, stubTransformerContext] = getTransformerInputsFromSchema(
      duplicateNameMappingModelSchema,
      modelName,
    );
    expect(() =>
      refersToTransformer.object(stubDefinition as ObjectTypeDefinitionNode, stubDirective as DirectiveNode, stubTransformerContext),
    ).toThrowErrorMatchingInlineSnapshot(
      '"Cannot apply @refersTo with name \\"OriginalName\\" on type \\"TestName\\" because \\"DuplicateName\\" model already has the same name mapping."',
    );
  });

  it('pre-mutates the schema to reassign type mappings', () => {
    refersToTransformer.preMutateSchema({
      ...(stubTransformerContextBase as unknown as TransformerPreProcessContextProvider),
      inputDocument: parse(simpleSchema),
    });

    expect(setTypeMapping_mock).toHaveBeenCalledWith('TestName', 'OriginalName');
  });
});

describe('@refersTo directive on fields', () => {
  const hostStub = 'host_stub';
  const setModelNameMapping_mock = jest.fn();
  const getResolver_mock = jest.fn();
  const getModelFieldMapKeys_mock = jest.fn();
  const getModelFieldMap_mock = jest.fn();
  const setTypeMapping_mock = jest.fn();
  const attachFieldMappingSlot_mock = attachFieldMappingSlot as jest.MockedFunction<typeof attachFieldMappingSlot>;

  const modelName = 'Todo';
  const stubTransformerContextBase = {
    resolvers: {
      getResolver: getResolver_mock,
    },
    resourceHelper: {
      setModelNameMapping: setModelNameMapping_mock,
      getModelFieldMapKeys: getModelFieldMapKeys_mock,
      getModelFieldMap: getModelFieldMap_mock,
    },
    api: {
      host: hostStub,
    },
    schemaHelper: {
      setTypeMapping: setTypeMapping_mock,
    },
  };

  const mappedFieldName = 'details';

  const simpleSchema = /* GraphQL */ `
    type ${modelName} @model {
      id: ID!
      details: String @refersTo(name: "Description")
    }
  `;

  const duplicateFieldMappingsSchema = /* GraphQL */ `
    type ${modelName} @model {
      id: ID!
      details: String @refersTo(name: "Description")
      description: String @refersTo(name: "Description")
    }

    type OriginalName @model {
      id: ID!
    }
  `;

  const conflictingFieldsSchema = /* GraphQL */ `
    type ${modelName} @model @refersTo(name: "OriginalName") {
      id: ID!
      details: String @refersTo(name: "description")
      description: String
    }
  `;

  const getTransformerInputsFromSchema = (schema: string, modelName: string) => {
    const ast = parse(schema);
    const parent = ast.definitions.find(
      (def) => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === modelName,
    ) as ObjectTypeDefinitionNode;
    const field = parent.fields?.find((field) => field.name.value === mappedFieldName)!;
    const directive = field.directives?.find((directive) => directive.name.value === 'refersTo')!;
    return [
      parent as DeepWriteable<ObjectTypeDefinitionNode>,
      field as DeepWriteable<FieldDefinitionNode>,
      directive as DeepWriteable<DirectiveNode>,
      {
        ...stubTransformerContextBase,
        inputDocument: ast,
        dataSourceStrategies: constructDataSourceStrategies(schema, mySqlStrategy),
      } as unknown as TransformerSchemaVisitStepContextProvider,
    ] as const;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can be applied only on model types', () => {
    const schema = /* GraphQL */ `
      type ${modelName} {
        id: ID!
        details: String @refersTo(name: "description")
      }
    `;
    const [parent, field, directive, context] = getTransformerInputsFromSchema(schema, modelName);
    expect(() =>
      refersToTransformer.field(parent as ObjectTypeDefinitionNode, field as FieldDefinitionNode, directive as DirectiveNode, context),
    ).toThrowErrorMatchingInlineSnapshot('"@refersTo is not supported on type Todo. It can only be used on a @model type."');
  });

  it('can be applied only on RDS model types', () => {
    const modelName = 'DDBModel';
    const schema = /* GraphQL */ `
      type ${modelName} @model {
        id: ID!
        details: String @refersTo(name: "description")
      }
    `;
    const [parent, field, directive, context] = getTransformerInputsFromSchema(schema, modelName);
    context.dataSourceStrategies[modelName] = DDB_DEFAULT_DATASOURCE_STRATEGY;
    expect(() =>
      refersToTransformer.field(parent as ObjectTypeDefinitionNode, field as FieldDefinitionNode, directive as DirectiveNode, context),
    ).toThrowErrorMatchingInlineSnapshot(`"@refersTo is only supported on SQL models. DDBModel is not a SQL model."`);
  });

  it('cannot be applied on relational fields in a model', () => {
    const schema = /* GraphQL */ `
      type ${modelName} @model {
        id: ID!
        details: String @refersTo(name: "description") @belongsTo(references: ["parentId"])
      }
    `;
    const [parent, field, directive, context] = getTransformerInputsFromSchema(schema, modelName);
    expect(() =>
      refersToTransformer.field(parent as ObjectTypeDefinitionNode, field as FieldDefinitionNode, directive as DirectiveNode, context),
    ).toThrowErrorMatchingInlineSnapshot('"@refersTo is not supported on \\"details\\" relational field in \\"Todo\\" model."');
  });

  it('requires a name to be specified', () => {
    const schema = /* GraphQL */ `
      type ${modelName} @model {
        id: ID!
        details: String @refersTo
      }
    `;
    const [parent, field, directive, context] = getTransformerInputsFromSchema(schema, modelName);
    expect(() =>
      refersToTransformer.field(parent as ObjectTypeDefinitionNode, field as FieldDefinitionNode, directive as DirectiveNode, context),
    ).toThrowErrorMatchingInlineSnapshot('"name is required in @refersTo directive."');
  });

  it('requires a string value for name', () => {
    const schema = /* GraphQL */ `
      type ${modelName} @model {
        id: ID!
        details: String @refersTo(name: ["description"])
      }
    `;
    const [parent, field, directive, context] = getTransformerInputsFromSchema(schema, modelName);
    expect(() =>
      refersToTransformer.field(parent as ObjectTypeDefinitionNode, field as FieldDefinitionNode, directive as DirectiveNode, context),
    ).toThrowErrorMatchingInlineSnapshot('"A single string must be provided for \\"name\\" in @refersTo directive"');
  });

  it('throws if a duplicate field name mapping is present in the schema', () => {
    const [parent, field, directive, context] = getTransformerInputsFromSchema(duplicateFieldMappingsSchema, modelName);
    expect(() =>
      refersToTransformer.field(parent as ObjectTypeDefinitionNode, field as FieldDefinitionNode, directive as DirectiveNode, context),
    ).toThrowErrorMatchingInlineSnapshot(
      '"Cannot apply @refersTo with name \\"Description\\" on field \\"details\\" in type \\"Todo\\" because \\"description\\" field already has the same name mapping."',
    );
  });

  it('throws if a conflicting field name is present in the schema', () => {
    const [parent, field, directive, context] = getTransformerInputsFromSchema(conflictingFieldsSchema, modelName);
    expect(() =>
      refersToTransformer.field(parent as ObjectTypeDefinitionNode, field as FieldDefinitionNode, directive as DirectiveNode, context),
    ).toThrowErrorMatchingInlineSnapshot(
      '"Cannot apply @refersTo with name \\"description\\" on field \\"details\\" in type \\"Todo\\" because \\"description\\" field already exists in the model."',
    );
  });

  it('registers the field name mappings', () => {
    const [parent, field, directive, context] = getTransformerInputsFromSchema(simpleSchema, modelName);
    context.resourceHelper.getModelFieldMap = jest.fn().mockReturnValue({
      addMappedField: jest.fn(),
    });
    refersToTransformer.field(parent as ObjectTypeDefinitionNode, field as FieldDefinitionNode, directive as DirectiveNode, context);
    expect(context.resourceHelper.getModelFieldMap).toBeCalledWith(modelName);
    expect(context.resourceHelper.getModelFieldMap(modelName).addMappedField).toBeCalledWith({
      currentFieldName: mappedFieldName,
      originalFieldName: 'Description',
    });
  });

  it('attaches resolver slot if field mapping exists for RDS Model', () => {
    const [parent, field, directive, context] = getTransformerInputsFromSchema(simpleSchema, modelName);
    context.resourceHelper.getModelFieldMapKeys = jest.fn().mockReturnValue([modelName]);
    context.resourceHelper.getModelFieldMap = jest.fn().mockReturnValue({
      getMappedFields: jest.fn().mockReturnValue([{ currentFieldName: mappedFieldName, originalFieldName: 'Description' }]),
      getResolverReferences: jest.fn().mockReturnValue([{ typeName: 'Query', fieldName: mappedFieldName, isList: false }]),
    });
    getResolver_mock.mockReturnValue({});
    refersToTransformer.after(context as TransformerContextProvider);
    expect(attachFieldMappingSlot_mock).toBeCalledWith({
      resolver: {},
      resolverTypeName: 'Query',
      resolverFieldName: mappedFieldName,
      fieldMap: [{ currentFieldName: mappedFieldName, originalFieldName: 'Description' }],
    });
  });

  it('does not attach resolver slot even if field mapping exists for DDB Model', () => {
    const [parent, field, directive, context] = getTransformerInputsFromSchema(simpleSchema, modelName);
    context.dataSourceStrategies[modelName] = DDB_DEFAULT_DATASOURCE_STRATEGY;
    expect(attachFieldMappingSlot_mock).toBeCalledTimes(0);
  });

  it('does not attach resolver slot if field mapping does not exist for RDS Model', () => {
    const [parent, field, directive, context] = getTransformerInputsFromSchema(simpleSchema, modelName);
    context.resourceHelper.getModelFieldMapKeys = jest.fn().mockReturnValue([modelName]);
    context.resourceHelper.getModelFieldMap = jest.fn().mockReturnValue({
      getMappedFields: jest.fn().mockReturnValue([]),
      getResolverReferences: jest.fn().mockReturnValue([{ typeName: 'Query', fieldName: mappedFieldName, isList: false }]),
    });
    refersToTransformer.after(context as TransformerContextProvider);
    expect(attachFieldMappingSlot_mock).toBeCalledTimes(0);
  });

  it('does not attach resolver slot if the resolver does not exist for RDS Model', () => {
    const [parent, field, directive, context] = getTransformerInputsFromSchema(simpleSchema, modelName);
    context.resourceHelper.getModelFieldMapKeys = jest.fn().mockReturnValue([modelName]);
    context.resourceHelper.getModelFieldMap = jest.fn().mockReturnValue({
      getMappedFields: jest.fn().mockReturnValue([]),
    });
    getResolver_mock.mockReturnValue(undefined);
    refersToTransformer.after(context as TransformerContextProvider);
    expect(attachFieldMappingSlot_mock).toBeCalledTimes(0);
  });
});
