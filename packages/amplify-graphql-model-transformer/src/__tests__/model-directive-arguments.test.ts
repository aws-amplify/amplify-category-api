import { ModelTransformer, RdsModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { GraphQLTransform, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { getFieldOnObjectType, getObjectType } from './test-utils/helpers';

describe('createdAt field tests', () => {
  test.each(['model', 'rdsModel'])(
    'should return createdAt when there is no timestamps configuration for @%s',
    (directiveName: string) => {
      const doc = /* GraphQL */ `
        type Post @${directiveName} {
          id: ID!
          title: String
        }
      `;

      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
      });

      const out = transformer.transform(doc);
      expect(out).toBeDefined();

      const definition = out.schema;
      expect(definition).toBeDefined();

      const parsed = parse(definition);
      validateModelSchema(parsed);
      const postModelObject = getObjectType(parsed, 'Post');
      const postModelField = getFieldOnObjectType(postModelObject!, 'createdAt');

      expect(postModelField).toBeDefined();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should return null when timestamps are set to null for @%s',
    (directiveName: string) => {
      const doc = /* GraphQL */ `
        type Post @${directiveName}(timestamps: null) {
          id: ID!
          title: String
        }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
      });

      const out = transformer.transform(doc);
      expect(out).toBeDefined();

      const definition = out.schema;
      expect(definition).toBeDefined();

      const parsed = parse(definition);
      validateModelSchema(parsed);
      const postModelObject = getObjectType(parsed, 'Post');
      const postModelField = getFieldOnObjectType(postModelObject!, 'createdAt');

      expect(postModelField).toBeUndefined();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should return null when createdAt is set to null',
    (directiveName: string) => {
      const doc = /* GraphQL */ `
        type Post @${directiveName}(timestamps: { createdAt: null }) {
          id: ID!
          title: String
        }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
      });

      const out = transformer.transform(doc);
      expect(out).toBeDefined();

      const definition = out.schema;
      expect(definition).toBeDefined();

      const parsed = parse(definition);
      validateModelSchema(parsed);
      const postModelObject = getObjectType(parsed, 'Post');
      const postModelField = getFieldOnObjectType(postModelObject!, 'createdAt');

      expect(postModelField).toBeUndefined();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should return createdOn when createdAt is set to createdOn for @%s',
    (directivName: string) => {
      const doc = /* GraphQL */ `
        type Post @${directivName}(timestamps: { createdAt: "createdOn" }) {
          id: ID!
          title: String
        }
      `;

      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
      });
      const out = transformer.transform(doc);
      expect(out).toBeDefined();

      const definition = out.schema;
      expect(definition).toBeDefined();

      const parsed = parse(definition);
      validateModelSchema(parsed);
      const postModelObject = getObjectType(parsed, 'Post');
      const postModelField = getFieldOnObjectType(postModelObject!, 'createdOn');

      expect(postModelField).toBeDefined();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should return createdAt when createdAt is not set in timestamps for @%s',
    (directiveName: string) => {
      const doc = /* GraphQL */ `
        type Post @${directiveName}(timestamps: { updatedAt: "updatedOn" }) {
          id: ID!
          title: String
        }
      `;

      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
      });
      const out = transformer.transform(doc);
      expect(out).toBeDefined();

      const definition = out.schema;
      expect(definition).toBeDefined();

      const parsed = parse(definition);
      validateModelSchema(parsed);
      const postModelObject = getObjectType(parsed, 'Post');
      const postModelField = getFieldOnObjectType(postModelObject!, 'createdAt');

      expect(postModelField).toBeDefined();
    },
  );
});

describe('updatedAt field tests', () => {
  test.each(['model', 'rdsModel'])(
    'should return updatedAt when there is no timestamps configuration for @%s',
    (directiveName: string) => {
      const doc = /* GraphQL */ `
        type Post @${directiveName} {
          id: ID!
          title: String
        }
      `;

      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
      });

      const out = transformer.transform(doc);
      expect(out).toBeDefined();

      const definition = out.schema;
      expect(definition).toBeDefined();

      const parsed = parse(definition);
      validateModelSchema(parsed);
      const postModelObject = getObjectType(parsed, 'Post');
      const postModelField = getFieldOnObjectType(postModelObject!, 'updatedAt');

      expect(postModelField).toBeDefined();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should return null for updatedAt when timestamps are set to null for @%s',
    (directiveName: string) => {
      const doc = /* GraphQL */ `
        type Post @${directiveName}(timestamps: null) {
          id: ID!
          title: String
        }
      `;

      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
      });

      const out = transformer.transform(doc);
      expect(out).toBeDefined();

      const definition = out.schema;
      expect(definition).toBeDefined();

      const parsed = parse(definition);
      validateModelSchema(parsed);
      const postModelObject = getObjectType(parsed, 'Post');
      const postModelField = getFieldOnObjectType(postModelObject!, 'updatedAt');

      expect(postModelField).toBeUndefined();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should return null when updatedAt is set to null for @%s',
    (directiveName: string) => {
      const doc = /* GraphQL */ `
        type Post @${directiveName}(timestamps: { updatedAt: null }) {
          id: ID!
          title: String
        }
      `;
      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
      });

      const out = transformer.transform(doc);
      expect(out).toBeDefined();

      const definition = out.schema;
      expect(definition).toBeDefined();

      const parsed = parse(definition);
      validateModelSchema(parsed);
      const postModelObject = getObjectType(parsed, 'Post');
      const postModelField = getFieldOnObjectType(postModelObject!, 'updatedAt');

      expect(postModelField).toBeUndefined();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should return updatedOn when updatedAt is set to updatedOn for @%s',
    (directiveName: string) => {
      const doc = /* GraphQL */ `
        type Post @${directiveName}(timestamps: { updatedAt: "updatedOn" }) {
          id: ID!
          title: String
        }
      `;

      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
      });
      const out = transformer.transform(doc);
      expect(out).toBeDefined();

      const definition = out.schema;
      expect(definition).toBeDefined();

      const parsed = parse(definition);
      validateModelSchema(parsed);
      const postModelObject = getObjectType(parsed, 'Post');
      const postModelField = getFieldOnObjectType(postModelObject!, 'updatedOn');

      expect(postModelField).toBeDefined();
    },
  );

  test.each(['model', 'rdsModel'])(
    'should return updatedAt when updatedAt is not set in timestamps for @%s',
    (directiveName: string) => {
      const doc = /* GraphQL */ `
        type Post @${directiveName}(timestamps: { createdAt: "createdOnOn" }) {
          id: ID!
          title: String
        }
      `;

      const transformer = new GraphQLTransform({
        transformers: [new ModelTransformer(), new RdsModelTransformer()],
      });
      const out = transformer.transform(doc);
      expect(out).toBeDefined();

      const definition = out.schema;
      expect(definition).toBeDefined();

      const parsed = parse(definition);
      validateModelSchema(parsed);
      const postModelObject = getObjectType(parsed, 'Post');
      const postModelField = getFieldOnObjectType(postModelObject!, 'updatedAt');

      expect(postModelField).toBeDefined();
    },
  );
});
