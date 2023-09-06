import { DirectiveNode, Kind, ObjectTypeDefinitionNode, parse } from 'graphql';
import {
  TransformerContextProvider,
  TransformerPreProcessContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { constructModelToDataSourceMap } from './__integ__/common';
import { MYSQL_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import { RefersToTransformer } from '../graphql-refers-to-transformer';

jest.mock('../field-mapping-resolvers');

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

describe('@refersTo directive', () => {
  const setModelNameMapping_mock = jest.fn();
  const getResolver_mock = jest.fn();
  const getModelFieldMapKeys_mock = jest.fn();
  const getModelFieldMap_mock = jest.fn();
  const setTypeMapping_mock = jest.fn();

  const host_stub = 'host_stub';

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
    modelToDatasourceMap: constructModelToDataSourceMap(['TestName'], MYSQL_DB_TYPE),
  };

  const refersToTransformer = new RefersToTransformer();
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
      { ...stubTransformerContextBase, inputDocument: ast } as unknown as TransformerSchemaVisitStepContextProvider,
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
    ).toThrowErrorMatchingInlineSnapshot(`"@refersTo is not supported on type TestName. It can only be used on a @model type."`);
  });

  it('can be applied only on RDS models', () => {
    const schema = /* GraphQL */ `
      type DDBModel @refersTo(name: "OriginalName") @model {
        id: ID!
      }
    `;
    const [stubDefinition, stubDirective, stubTransformerContext] = getTransformerInputsFromSchema(schema, 'DDBModel');
    stubTransformerContext.modelToDatasourceMap.set('DDBModel', { dbType: 'DDB', provisionDB: false });
    stubDirective.arguments = [];
    expect(() =>
      refersToTransformer.object(stubDefinition as ObjectTypeDefinitionNode, stubDirective as DirectiveNode, stubTransformerContext),
    ).toThrowErrorMatchingInlineSnapshot(`"refersTo is only supported on RDS models. DDBModel is not an RDS model."`);
  });

  it('requires a name to be specified', () => {
    const [stubDefinition, stubDirective, stubTransformerContext] = getTransformerInputsFromSchema(simpleSchema, modelName);
    stubDirective.arguments = [];
    expect(() =>
      refersToTransformer.object(stubDefinition as ObjectTypeDefinitionNode, stubDirective as DirectiveNode, stubTransformerContext),
    ).toThrowErrorMatchingInlineSnapshot(`"name is required in @refersTo directive."`);
  });

  it('requires a string value for name', () => {
    const [stubDefinition, stubDirective, stubTransformerContext] = getTransformerInputsFromSchema(simpleSchema, modelName);
    stubDirective.arguments![0].value.kind = 'ListValue';
    expect(() =>
      refersToTransformer.object(stubDefinition as ObjectTypeDefinitionNode, stubDirective as DirectiveNode, stubTransformerContext),
    ).toThrowErrorMatchingInlineSnapshot(`"A single string must be provided for \\"name\\" in @refersTo directive"`);
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
      `"Cannot apply @refersTo with name \\"OriginalName\\" on type \\"TestName\\" because \\"OriginalName\\" model already exists in the schema."`,
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
      `"Cannot apply @refersTo with name \\"OriginalName\\" on type \\"TestName\\" because \\"DuplicateName\\" model already has the same name mapping."`,
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
