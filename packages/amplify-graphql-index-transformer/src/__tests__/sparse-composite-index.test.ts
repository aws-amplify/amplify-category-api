import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AmplifyAppSyncSimulator, AmplifyAppSyncSimulatorAuthenticationType } from '@aws-amplify/amplify-appsync-simulator';
import { VelocityTemplate } from '@aws-amplify/amplify-appsync-simulator/lib/velocity';
import { buildSchema, graphqlSync, GraphQLResolveInfo } from 'graphql';
import { IndexTransformer, PrimaryKeyTransformer } from '..';

const simulator = new AmplifyAppSyncSimulator();
const executionSchema = buildSchema('type Query { evaluate: String }');

const createdAt = '2026-01-01T00:00:00.000Z';
const derivedKey = 'conversationId#createdAt';

type Operation = 'create' | 'update';

function templates(requiredConversation = false): Record<Operation, string[]> {
  const output = testTransform({
    schema: `
      type Request @model {
        owner: String! @primaryKey(sortKeyFields: ["requestId"])
          @index(name: "byConversation", sortKeyFields: ["conversationId", "createdAt"])
        requestId: ID!
        conversationId: ID${requiredConversation ? '!' : ''}
        status: String
        createdAt: AWSDateTime
      }
    `,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new IndexTransformer()],
  });
  const preAuth = (operation: Operation): string[] =>
    Object.entries(output.resolvers)
      .filter(([name]) => name.startsWith(`Mutation.${operation}Request.preAuth.`) && name.endsWith('.req.vtl'))
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([, template]) => template);
  return { create: preAuth('create'), update: preAuth('update') };
}

function evaluate(
  resolverTemplates: string[],
  input: Record<string, unknown>,
  defaults: Record<string, unknown> = {},
): Record<string, unknown> {
  let args: { input: Record<string, unknown> } = { input: { owner: 'owner', requestId: 'request', ...input } };
  let stash: Record<string, unknown> = { metadata: {}, defaultValues: { ...defaults } };
  const response = graphqlSync({
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
          if (rendered.hadException || rendered.errors.length) {
            throw new Error(rendered.errors[0]?.message ?? 'Template execution failed');
          }
          args = rendered.args;
          stash = rendered.stash;
        }
        return 'evaluated';
      },
    },
  });
  if (response.errors?.length) throw response.errors[0];
  return args.input;
}

describe('sparse composite secondary index resolver execution', () => {
  let sparse: Record<Operation, string[]>;
  let required: Record<Operation, string[]>;
  beforeAll(() => {
    sparse = templates();
    required = templates(true);
    if (!sparse.create.length || !sparse.update.length) throw new Error('Missing index resolver templates');
  });

  test.each([{}, { conversationId: null }])('create skips the index with a default timestamp and optional association (%j)', (input) => {
    const result = evaluate(sparse.create, input, { createdAt });
    expect(result).not.toHaveProperty(derivedKey);
    expect(result).toMatchObject({ owner: 'owner', requestId: 'request' });
  });
  test('create skips the index when another nullable component is explicitly null', () => {
    expect(evaluate(sparse.create, { conversationId: 'conversation', createdAt: null }, { createdAt })).not.toHaveProperty(derivedKey);
  });
  test('create constructs a complete key using the default timestamp', () => {
    expect(evaluate(sparse.create, { conversationId: 'conversation' }, { createdAt })).toHaveProperty(
      derivedKey,
      `conversation#${createdAt}`,
    );
  });
  test('create still rejects an omitted required component', () => {
    expect(() => evaluate(required.create, {}, { createdAt })).toThrow("Missing key: 'conversationId'");
  });
  test('status-only updates leave index membership untouched', () => {
    expect(evaluate(sparse.update, { status: 'PROCESSED' })).not.toHaveProperty(derivedKey);
  });
  test.each([{ conversationId: null }, { createdAt: null }])('explicit clearing emits a null derived key for removal (%j)', (input) => {
    const result = evaluate(sparse.update, input);
    expect(Object.prototype.hasOwnProperty.call(result, derivedKey)).toBe(true);
    expect(result[derivedKey]).toBeNull();
  });
  test('an explicitly cleared nullable component permits omission of a required component', () => {
    expect(evaluate(required.update, { createdAt: null })[derivedKey]).toBeNull();
  });
  test.each([{ conversationId: 'different' }, { createdAt }])('partial non-null updates still fail (%j)', (input) => {
    expect(() => evaluate(sparse.update, input)).toThrow('Missing key');
  });
  test('clearing a required component does not bypass partial-update validation', () => {
    expect(() => evaluate(required.update, { conversationId: null })).toThrow("Missing key: 'createdAt'");
  });
  test('complete updates restore a valid index key', () => {
    expect(evaluate(sparse.update, { conversationId: 'restored', createdAt })[derivedKey]).toBe(`restored#${createdAt}`);
  });
});
