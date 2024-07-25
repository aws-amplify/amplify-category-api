import { TransformerPluginBase } from '@aws-amplify/graphql-transformer-core';
import { testTransform } from '../test-transform';

class TestTransformer extends TransformerPluginBase {
  constructor() {
    super('test-transformer', 'directive @test on OBJECT');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  object(definition: any, directive: any, ctx: any): void {
    // No-op
  }
}

describe('testTransform', () => {
  it('runs', () => {
    expect(
      testTransform({
        schema: /* GraphQL */ `
          type Todo @test {
            content: String!
          }
        `,
        transformers: [new TestTransformer()],
      }),
    ).toBeDefined();
  });
});
