import { CedarPolicy, graphqlToCedar } from '../../../utils';

describe('graphqlToCedar', () => {
  it('parses a simple schema', () => {
    const schema = /* GraphQL */ `
      type Todo @model @auth(rules: [{ allow: public }]) {
        id: ID!
        content: String
      }
    `;

    const cedarBundle = graphqlToCedar(schema);

    const expectedPolicies: CedarPolicy[] = [
      {
        effect: 'permit',
        principal: {
          op: 'is',
          entity_type: 'AmplifyApi::AmplifyApiKeyUser',
        },
        resource: {
          op: 'is',
          entity_type: 'AmplifyApi::Todo',
        },
        action: {
          op: 'in',
          entities: [
            { type: 'AmplifyApi::Action', id: 'SelectionSetResolve.Todo' },
            { type: 'AmplifyApi::Action', id: 'SelectionSetResolve.Todo.id' },
            { type: 'AmplifyApi::Action', id: 'SelectionSetResolve.Todo.content' },
            { type: 'AmplifyApi::Action', id: 'Query.getTodo' },
            { type: 'AmplifyApi::Action', id: 'Query.getTodo.id' },
            { type: 'AmplifyApi::Action', id: 'Query.getTodo.content' },
            { type: 'AmplifyApi::Action', id: 'Query.listTodos' },
            { type: 'AmplifyApi::Action', id: 'Mutation.createTodo' },
            { type: 'AmplifyApi::Action', id: 'Mutation.createTodo.id' },
            { type: 'AmplifyApi::Action', id: 'Mutation.createTodo.content' },
            { type: 'AmplifyApi::Action', id: 'Mutation.updateTodo' },
            { type: 'AmplifyApi::Action', id: 'Mutation.updateTodo.id' },
            { type: 'AmplifyApi::Action', id: 'Mutation.updateTodo.content' },
            { type: 'AmplifyApi::Action', id: 'Mutation.deleteTodo' },
            { type: 'AmplifyApi::Action', id: 'Mutation.deleteTodo.id' },
            { type: 'AmplifyApi::Action', id: 'Mutation.deleteTodo.content' },
            { type: 'AmplifyApi::Action', id: 'Subscription.onCreateTodo' },
            { type: 'AmplifyApi::Action', id: 'Subscription.onDeleteTodo' },
            { type: 'AmplifyApi::Action', id: 'Subscription.onUpdateTodo' },
          ],
        },
        conditions: [],
        annotations: {
          id: 'permit public to operate on Todo',
        },
      },
    ];

    expect(cedarBundle).toMatchObject({
      policies: expectedPolicies,
    });
  });
});
