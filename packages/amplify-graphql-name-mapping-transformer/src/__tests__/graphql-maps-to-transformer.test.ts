import { DirectiveNode, Kind, ObjectTypeDefinitionNode, parse } from 'graphql';
import {
  FieldMapEntry,
  ModelFieldMap,
  TransformerContextProvider,
  TransformerPreProcessContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { LambdaDataSource } from 'aws-cdk-lib/aws-appsync';
import { DDB_DEFAULT_DATASOURCE_STRATEGY, constructDataSourceStrategies } from '@aws-amplify/graphql-transformer-core';
import { MapsToTransformer } from '../graphql-maps-to-transformer';
import { attachInputMappingSlot, attachResponseMappingSlot, attachFilterAndConditionInputMappingSlot } from '../field-mapping-resolvers';
import { createMappingLambda } from '../field-mapping-lambda';

jest.mock('../field-mapping-resolvers');
jest.mock('../field-mapping-lambda');

const attachInputMappingSlot_mock = attachInputMappingSlot as jest.MockedFunction<typeof attachInputMappingSlot>;
const attachResponseMappingSlot_mock = attachResponseMappingSlot as jest.MockedFunction<typeof attachResponseMappingSlot>;
const attachFilterAndConditionInputMappingSlot_mock = attachFilterAndConditionInputMappingSlot as jest.MockedFunction<
  typeof attachFilterAndConditionInputMappingSlot
>;
const createMappingLambda_mock = createMappingLambda as jest.MockedFunction<typeof createMappingLambda>;

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

describe('@mapsTo directive', () => {
  const setModelNameMapping_mock = jest.fn();
  const getResolver_mock = jest.fn();
  const getModelFieldMapKeys_mock = jest.fn();
  const getModelFieldMap_mock = jest.fn();
  const setTypeMapping_mock = jest.fn();

  const host_stub = 'host_stub';

  const modelName = 'TestName';

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
      host: host_stub,
    },
    schemaHelper: {
      setTypeMapping: setTypeMapping_mock,
    },
  };

  const lambdaDataSource_stub = 'lambdaDataSource_stub' as unknown as LambdaDataSource;

  createMappingLambda_mock.mockReturnValue(lambdaDataSource_stub);

  const mapsToTransformer = new MapsToTransformer();

  const simpleSchema = /* GraphQL */ `
    type ${modelName} @model @mapsTo(name: "OriginalName") {
      id: ID!
    }
  `;

  const conflictingModelSchema = /* GraphQL */ `
    type ${modelName} @model @mapsTo(name: "OriginalName") {
      id: ID!
    }

    type OriginalName @model {
      id: ID!
    }
  `;

  const getTransformerInputsFromSchema = (schema: string) => {
    const ast = parse(schema);
    const stubDefinition = ast.definitions.find(
      (def) => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === modelName,
    ) as ObjectTypeDefinitionNode;
    const stubDirective = stubDefinition.directives?.find((directive) => directive.name.value === 'mapsTo')!;
    return [
      stubDefinition as DeepWriteable<ObjectTypeDefinitionNode>,
      stubDirective as DeepWriteable<DirectiveNode>,
      {
        ...stubTransformerContextBase,
        inputDocument: ast,
        dataSourceStrategies: constructDataSourceStrategies(schema, DDB_DEFAULT_DATASOURCE_STRATEGY),
      } as unknown as TransformerSchemaVisitStepContextProvider,
    ] as const;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires a name to be specified', () => {
    const [stubDefinition, stubDirective, stubTransformerContext] = getTransformerInputsFromSchema(simpleSchema);
    stubDirective.arguments = [];
    expect(() =>
      mapsToTransformer.object(stubDefinition as ObjectTypeDefinitionNode, stubDirective as DirectiveNode, stubTransformerContext),
    ).toThrowErrorMatchingInlineSnapshot('"name is required in @mapsTo directive."');
  });

  it('requires a string value for name', () => {
    const [stubDefinition, stubDirective, stubTransformerContext] = getTransformerInputsFromSchema(simpleSchema);
    stubDirective.arguments![0].value.kind = 'ListValue';
    expect(() =>
      mapsToTransformer.object(stubDefinition as ObjectTypeDefinitionNode, stubDirective as DirectiveNode, stubTransformerContext),
    ).toThrowErrorMatchingInlineSnapshot(`"A single string must be provided for "name" in @mapsTo directive"`);
  });

  it('registers the rename mapping', () => {
    const [stubDefinition, stubDirective, stubTransformerContext] = getTransformerInputsFromSchema(simpleSchema);
    mapsToTransformer.object(stubDefinition as ObjectTypeDefinitionNode, stubDirective as DirectiveNode, stubTransformerContext);
    expect(setModelNameMapping_mock.mock.calls[0]).toEqual(['TestName', 'OriginalName']);
  });

  it('throws if a conflicting model name is present in the schema', () => {
    const [stubDefinition, stubDirective, stubTransformerContext] = getTransformerInputsFromSchema(conflictingModelSchema);
    expect(() =>
      mapsToTransformer.object(stubDefinition as ObjectTypeDefinitionNode, stubDirective as DirectiveNode, stubTransformerContext),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Cannot apply @mapsTo with name "OriginalName" on type "TestName" because "OriginalName" model already exists in the schema."`,
    );
  });

  it('attaches input and response mapping templates for mutations', () => {
    // setup
    const testFieldMap = [
      {
        currentFieldName: 'newFieldName',
        originalFieldName: 'origFieldName',
      },
    ];
    stubTransformerContextBase.resourceHelper.getModelFieldMapKeys.mockReturnValueOnce([modelName]);
    const modelFieldMap: ModelFieldMap = {
      getMappedFields: () => testFieldMap,
      getResolverReferences: () => [
        {
          typeName: 'Mutation',
          fieldName: `create${modelName}`,
          isList: false,
        },
      ],
    } as unknown as ModelFieldMap;
    stubTransformerContextBase.resourceHelper.getModelFieldMap.mockReturnValueOnce(modelFieldMap);
    const dummyResolver = { obj: 'this is a dummy resolver' };
    stubTransformerContextBase.resolvers.getResolver.mockImplementationOnce((typeName: string, fieldName: string) =>
      typeName === 'Mutation' && fieldName === `create${modelName}` ? dummyResolver : undefined,
    );

    const transformerContext = {
      ...stubTransformerContextBase,
      dataSourceStrategies: constructDataSourceStrategies(simpleSchema, DDB_DEFAULT_DATASOURCE_STRATEGY),
    };

    // test
    mapsToTransformer.after(transformerContext as unknown as TransformerContextProvider);

    // assert
    expect(attachInputMappingSlot_mock).toHaveBeenCalledTimes(1);
    expect(attachInputMappingSlot_mock).toHaveBeenCalledWith({
      resolver: dummyResolver,
      resolverFieldName: `create${modelName}`,
      resolverTypeName: 'Mutation',
      fieldMap: testFieldMap,
    });
    expect(attachResponseMappingSlot_mock).toHaveBeenCalledTimes(1);
    expect(attachResponseMappingSlot_mock).toHaveBeenCalledWith({
      slotName: 'postUpdate',
      resolver: dummyResolver,
      resolverFieldName: `create${modelName}`,
      resolverTypeName: 'Mutation',
      fieldMap: testFieldMap,
      isList: false,
    });
    expect(attachFilterAndConditionInputMappingSlot_mock).toHaveBeenCalledTimes(1);
    expect(attachFilterAndConditionInputMappingSlot_mock).toHaveBeenCalledWith({
      slotName: 'preUpdate',
      resolver: dummyResolver,
      resolverTypeName: 'Mutation',
      resolverFieldName: `create${modelName}`,
      fieldMap: testFieldMap,
      dataSource: lambdaDataSource_stub,
    });
  });

  it('attaches input and response mapping templates for queries', () => {
    // setup
    const testFieldMap = [
      {
        currentFieldName: 'newFieldName',
        originalFieldName: 'origFieldName',
      },
    ];
    stubTransformerContextBase.resourceHelper.getModelFieldMapKeys.mockReturnValueOnce([modelName]);
    const modelFieldMap: ModelFieldMap = {
      getMappedFields: () => testFieldMap,
      getResolverReferences: () => [
        {
          typeName: 'Query',
          fieldName: `get${modelName}`,
          isList: false,
        },
      ],
    } as unknown as ModelFieldMap;
    stubTransformerContextBase.resourceHelper.getModelFieldMap.mockReturnValueOnce(modelFieldMap);
    const dummyResolver = { obj: 'this is a dummy resolver' };
    stubTransformerContextBase.resolvers.getResolver.mockImplementationOnce((typeName: string, fieldName: string) =>
      typeName === 'Query' && fieldName === `get${modelName}` ? dummyResolver : undefined,
    );

    const transformerContext = {
      ...stubTransformerContextBase,
      dataSourceStrategies: constructDataSourceStrategies(simpleSchema, DDB_DEFAULT_DATASOURCE_STRATEGY),
    };

    // test
    mapsToTransformer.after(transformerContext as unknown as TransformerContextProvider);

    // assert
    expect(attachInputMappingSlot_mock).not.toHaveBeenCalled();
    expect(attachResponseMappingSlot_mock).toHaveBeenCalledTimes(1);
    expect(attachResponseMappingSlot_mock).toHaveBeenCalledWith({
      slotName: 'postDataLoad',
      resolver: dummyResolver,
      resolverFieldName: `get${modelName}`,
      resolverTypeName: 'Query',
      fieldMap: testFieldMap,
      isList: false,
    });
    expect(attachFilterAndConditionInputMappingSlot_mock).toHaveBeenCalledTimes(1);
    expect(attachFilterAndConditionInputMappingSlot_mock).toHaveBeenCalledWith({
      slotName: 'preDataLoad',
      resolver: dummyResolver,
      resolverTypeName: 'Query',
      resolverFieldName: `get${modelName}`,
      fieldMap: testFieldMap,
      dataSource: lambdaDataSource_stub,
    });
  });

  it('does not attach mappings if no resolver found', () => {
    // setup
    const testFieldMap = [
      {
        currentFieldName: 'newFieldName',
        originalFieldName: 'origFieldName',
      },
    ];
    stubTransformerContextBase.resourceHelper.getModelFieldMapKeys.mockReturnValueOnce([modelName]);
    const modelFieldMap: ModelFieldMap = {
      getMappedFields: () => testFieldMap,
      getResolverReferences: () => [
        {
          typeName: 'Query',
          fieldName: `get${modelName}`,
          isList: false,
        },
      ],
    } as unknown as ModelFieldMap;
    stubTransformerContextBase.resourceHelper.getModelFieldMap.mockReturnValueOnce(modelFieldMap);
    stubTransformerContextBase.resolvers.getResolver.mockReturnValueOnce(undefined);

    const transformerContext = {
      ...stubTransformerContextBase,
      dataSourceStrategies: constructDataSourceStrategies(simpleSchema, DDB_DEFAULT_DATASOURCE_STRATEGY),
    };

    // test
    mapsToTransformer.after(transformerContext as unknown as TransformerContextProvider);

    // assert
    expect(attachInputMappingSlot_mock).not.toHaveBeenCalled();
    expect(attachResponseMappingSlot_mock).not.toHaveBeenCalled();
  });

  it('does not attach resolvers if no mappings defined', () => {
    // setup
    const testFieldMap: FieldMapEntry[] = [];
    stubTransformerContextBase.resourceHelper.getModelFieldMapKeys.mockReturnValueOnce([modelName]);
    const modelFieldMap: ModelFieldMap = {
      getMappedFields: () => testFieldMap,
      getResolverReferences: () => [
        {
          typeName: 'Query',
          fieldName: `get${modelName}`,
          isList: false,
        },
      ],
    } as unknown as ModelFieldMap;
    stubTransformerContextBase.resourceHelper.getModelFieldMap.mockReturnValueOnce(modelFieldMap);
    stubTransformerContextBase.resolvers.getResolver.mockReturnValueOnce(undefined);

    const transformerContext = {
      ...stubTransformerContextBase,
      dataSourceStrategies: constructDataSourceStrategies(simpleSchema, DDB_DEFAULT_DATASOURCE_STRATEGY),
    };

    // test
    mapsToTransformer.after(transformerContext as unknown as TransformerContextProvider);

    // assert
    expect(attachInputMappingSlot_mock).not.toHaveBeenCalled();
    expect(attachResponseMappingSlot_mock).not.toHaveBeenCalled();
  });

  it('pre-mutates the schema to reassign type mappings', () => {
    mapsToTransformer.preMutateSchema({
      ...(stubTransformerContextBase as unknown as TransformerPreProcessContextProvider),
      inputDocument: parse(simpleSchema),
    });

    expect(setTypeMapping_mock).toHaveBeenCalledWith(modelName, 'OriginalName');
  });
});
