/* eslint-disable import/no-extraneous-dependencies */
import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { IndexTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { HasOneTransformer, ManyToManyTransformer } from '@aws-amplify/graphql-relational-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ObjectTypeDefinitionNode, parse } from 'graphql';
import { MapsToTransformer } from '../../graphql-maps-to-transformer';
import { expectedResolversForModelWithRenamedField } from './common';

const manyToManyMapped = /* GraphQL */ `
  type Employee @model @mapsTo(name: "Person") {
    id: ID!
    tasks: [Task] @manyToMany(relationName: "EmployeeTask")
  }

  type Task @model @mapsTo(name: "Todo") {
    id: ID!
    title: String
    employees: [Employee] @manyToMany(relationName: "EmployeeTask")
  }
`;

const transformSchema = (schema: string) => {
  const indexTransformer = new IndexTransformer();
  const modelTransformer = new ModelTransformer();
  const hasOneTransformer = new HasOneTransformer();
  const authTransformer = new AuthTransformer();
  return testTransform({
    schema,
    transformers: [
      modelTransformer,
      indexTransformer,
      hasOneTransformer,
      authTransformer,
      new ManyToManyTransformer(modelTransformer, indexTransformer, hasOneTransformer, authTransformer),
      new MapsToTransformer(),
    ],
    transformParameters: {
      respectPrimaryKeyAttributesOnConnectionField: false,
      sandboxModeEnabled: true,
    },
  });
};

describe('mapsTo with manyToMany', () => {
  it('creates resources with original GSIs and field names', () => {
    const out = transformSchema(manyToManyMapped);
    expect(out.stacks.EmployeeTask!.Resources!.EmployeeTaskTable.Properties.GlobalSecondaryIndexes).toMatchSnapshot();
    const outSchema = parse(out.schema);
    const EmployeeTaskFields = (
      outSchema.definitions.find((def) => (def as any)?.name.value === 'EmployeeTask')! as ObjectTypeDefinitionNode
    ).fields!.map((field) => field.name.value);
    expect(EmployeeTaskFields).toEqual(
      expect.arrayContaining(['id', 'employeeID', 'taskID', 'task', 'employee', 'createdAt', 'updatedAt']),
    );
    const expectedResolvers = expectedResolversForModelWithRenamedField('EmployeeTask');
    expectedResolvers.forEach((resolver) => expect(out.resolvers[resolver]).toMatchSnapshot());
  });
});
