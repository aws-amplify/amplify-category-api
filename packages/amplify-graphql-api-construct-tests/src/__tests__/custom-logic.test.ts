import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, initCDKProject, cdkDeploy, cdkDestroy } from 'amplify-category-api-e2e-core';
import { graphql } from './graphql-utils';

describe('CDK GraphQL Transformer - Custom Logic', () => {
  let projRoot: string;
  let apiEndpoint: string;
  let apiKey: string;

  /**
   * Deploy the CDK App before running our test suite.
   * Persist the Endpoint+ApiKey so we can make queries against it.
   */
  beforeAll(async () => {
    projRoot = await createNewProjectDir('cdkcustomlogic');
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'custom-logic'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    apiEndpoint = outputs[name].GraphQLAPIEndpointOutput;
    apiKey = outputs[name].GraphQLAPIKeyOutput;
  });

  /**
   * Destroy the Cloudformation Stack, and delete the local project directory.
   */
  afterAll(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(projRoot);
  });

  test('function directive can be used to reverse a string on a custom query', async () => {
    const reverseResult = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        query REVERSE {
          reverse(message: "Hello, World!")
        }
      `,
    );
    expect(reverseResult.statusCode).toEqual(200);
    const reversedMessage = reverseResult.body.data.reverse;

    expect(reversedMessage).toBeDefined();
    expect(reversedMessage).toEqual('!dlroW ,olleH');
  });

  test('custom resolver can be used to echo a string on a custom query', async () => {
    const echoResult = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        query ECHO {
          echo(message: "Hello, World!")
        }
      `,
    );
    expect(echoResult.statusCode).toEqual(200);
    const echoedMessage = echoResult.body.data.echo;

    expect(echoedMessage).toBeDefined();
    expect(echoedMessage).toEqual('Hello, World!');
  });
});
