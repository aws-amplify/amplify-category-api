import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AmplifyAppSyncSimulator, AmplifyAppSyncSimulatorAuthenticationType } from '@aws-amplify/amplify-appsync-simulator';
import { VelocityTemplate } from '@aws-amplify/amplify-appsync-simulator/lib/velocity';
import { buildSchema, graphqlSync, GraphQLResolveInfo } from 'graphql';
import { IndexTransformer, PrimaryKeyTransformer } from '..';

const simulator = new AmplifyAppSyncSimulator();
const executionSchema = buildSchema('type Query { evaluate: String }');
const createdAt = '2026-01-01T00:00:00.000Z';

function templates(schema: string): { create: string[]; update: string[] } {
  const output = testTransform({
    schema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
  });
  const preAuth = (operation: string): string[] =>
    Object.entries(output.resolvers)
      .filter(([name]) => name.startsWith(`Mutation.${operation}Record.preAuth.`) && name.endsWith('.req.vtl'))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, template]) => template);
  return { create: preAuth('create'), update: preAuth('update') };
}

function evaluate(resolverTemplates: string[], input: Record<string, unknown>, defaults: Record<string, unknown> = {}) {
  let args = { input: { ...input } };
  let stash: Record<string, unknown> = { metadata: {}, defaultValues: { ...defaults } };
  const result = graphqlSync({
    schema: executionSchema,
    source: '{ evaluate }',
    rootValue: {
      evaluate: (...[, , info]: [unknown, unknown, GraphQLResolveInfo]) => {
        for (const content of resolverTemplates) {
          const rendered = new VelocityTemplate({ content }, simulator).render(
            { arguments: args, stash, source: {} },
            { requestAuthorizationMode: AmplifyAppSyncSimulatorAuthenticationType.API_KEY, headers: {} },
            info,
          );
          if (rendered.hadException || rendered.errors.length) throw new Error(rendered.errors[0]?.message ?? 'Template execution failed');
          args = rendered.args;
          stash = rendered.stash;
        }
        return 'evaluated';
      },
    },
  });
  if (result.errors?.length) throw result.errors[0];
  return args.input;
}

describe.each([
  {
    name: 'primary composite sort-key field',
    schema: `type Record @model {
      owner: String! @primaryKey(sortKeyFields: ["conversationId", "messageId"])
        @index(name: "byConversation", sortKeyFields: ["conversationId", "createdAt"])
      conversationId: ID! messageId: ID! content: String createdAt: AWSDateTime!
    }`,
    input: { owner: 'owner', conversationId: 'conversation', messageId: 'message' },
    derivedKey: 'conversationId#createdAt',
    prefix: 'conversation',
  },
  {
    name: 'custom primary partition-key field',
    schema: `type Record @model {
      recordId: ID! @primaryKey
      owner: String! @index(name: "byRecord", sortKeyFields: ["recordId", "createdAt"])
      content: String createdAt: AWSDateTime!
    }`,
    input: { recordId: 'record', owner: 'owner' },
    derivedKey: 'recordId#createdAt',
    prefix: 'record',
  },
  {
    name: 'default primary id field',
    schema: `type Record @model {
      id: ID!
      owner: String! @index(name: "byRecord", sortKeyFields: ["id", "createdAt"])
      content: String createdAt: AWSDateTime!
    }`,
    input: { id: 'record', owner: 'owner' },
    derivedKey: 'id#createdAt',
    prefix: 'record',
  },
])('$name in a secondary composite sort key', ({ schema, input, derivedKey, prefix }) => {
  let generated: ReturnType<typeof templates>;
  beforeAll(() => {
    generated = templates(schema);
  });

  test('identifiers do not trigger index reconstruction on an unrelated update', () => {
    expect(evaluate(generated.update, { ...input, content: 'frozen context' })).not.toHaveProperty(derivedKey);
  });
  test('create still constructs the index with the default timestamp', () => {
    expect(evaluate(generated.create, input, { createdAt })[derivedKey]).toBe(`${prefix}#${createdAt}`);
  });
  test('an explicitly supplied mutable component rebuilds the complete index key', () => {
    expect(evaluate(generated.update, { ...input, createdAt })[derivedKey]).toBe(`${prefix}#${createdAt}`);
  });
});

test('immutable identifiers cannot hide a partial update of mutable index components', () => {
  const generated = templates(`type Record @model {
    owner: String! @primaryKey(sortKeyFields: ["conversationId", "messageId"])
      @index(name: "byConversation", sortKeyFields: ["conversationId", "category", "createdAt"])
    conversationId: ID! messageId: ID! category: String! createdAt: AWSDateTime! content: String
  }`);
  const input = { owner: 'owner', conversationId: 'conversation', messageId: 'message' };
  expect(evaluate(generated.update, { ...input, content: 'changed' })).not.toHaveProperty('conversationId#category#createdAt');
  expect(() => evaluate(generated.update, { ...input, category: 'changed' })).toThrow("Missing key: 'createdAt'");
  expect(evaluate(generated.update, { ...input, category: 'changed', createdAt })['conversationId#category#createdAt']).toBe(
    `conversation#changed#${createdAt}`,
  );
});

describe('multiple indexes with immutable and mutable components', () => {
  let generated: ReturnType<typeof templates>;
  const input = { owner: 'owner', conversationId: 'conversation', messageId: 'message' };
  beforeAll(() => {
    generated = templates(`type Record @model {
      owner: String! @primaryKey(sortKeyFields: ["conversationId", "messageId"])
        @index(name: "byMessage", sortKeyFields: ["messageId", "conversationId"])
        @index(name: "byCategory", sortKeyFields: ["conversationId", "category"])
      conversationId: ID! messageId: ID! category: String! content: String
    }`);
  });
  test('identifier-only updates preserve both index keys', () => {
    const result = evaluate(generated.update, { ...input, content: 'changed' });
    expect(result).not.toHaveProperty('messageId#conversationId');
    expect(result).not.toHaveProperty('conversationId#category');
  });
  test('a mutable update reconstructs only its own index key', () => {
    const result = evaluate(generated.update, { ...input, category: 'changed' });
    expect(result).toHaveProperty('conversationId#category', 'conversation#changed');
    expect(result).not.toHaveProperty('messageId#conversationId');
  });
});
