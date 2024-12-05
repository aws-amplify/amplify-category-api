import * as fs from 'node:fs';
import * as path from 'node:path';
import * as cp from 'node:child_process';

import { Stack } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { AmplifyGraphqlApi, AmplifyGraphqlDefinition } from '@aws-amplify/graphql-api-construct';
import {
  AppSyncIdentityCognitoUserPools,
  makeUserPoolsContext,
  amplifyAuthExprToJsonExpr,
  cedarExprToJsonExpr,
  evaluateMappingTemplate,
  extractContextFromMappingResult,
  mergeTemplate,
} from '../../../utils';
import {} from '../../../utils/appsync-context';

const region = process.env.AWS_REGION || 'us-west-2';

// FOR DEMO ONLY:
process.env.AWS_ACCOUNT = '753571231881';
process.env.AWS_PROFILE = 'schmelte+amplify-devops-automation-gamma@amazon.com';

describe('owner auth', () => {
  // Fixture data.
  
  // amplify schema is hand-written for the test case
  const amplifyGraphqlSchema = fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8');

  // Cedar fixtures are currently hand-written, but can eventually be generated
  const cedarSchemaPath = path.resolve(path.join(__dirname, 'amplify.cedarschema'));
  const cedarPolicyPath = path.resolve(path.join(__dirname, 'policies.cedar'));
  const cedarEntitiesPath = path.resolve(path.join(__dirname, 'entities.json'));

  const stack = new Stack();

  const userPool = new UserPool(stack, 'DrtTestUserPool', {});

  const api = new AmplifyGraphqlApi(stack, 'DrtTestApi', {
    apiName: 'MyApi',
    definition: AmplifyGraphqlDefinition.fromString(amplifyGraphqlSchema),
    authorizationModes: {
      defaultAuthorizationMode: 'AMAZON_COGNITO_USER_POOLS',
      userPoolConfig: { userPool },
    },
  });

  test('Query.getTodo', async () => {
    const typeName = 'Query';
    const fieldName = 'getTodo';

    // Concatenate all functions into a single mapping template for evaluation
    const mergedTemplate = mergeTemplate({ api, fieldName, typeName });

    // TODO: Make Amplify context & Cedar entities/contexts from a single shared source of truth
    const amplifyContext = makeUserPoolsContext();
    const result = await evaluateMappingTemplate({ region, template: mergedTemplate, context: amplifyContext });
    console.log(`### EvaluateMappingTemplate result:\n${JSON.stringify(result, null, 2)}`);
    expect(result.error).toBeUndefined();
    expect(result.evaluationResult).toBeDefined();
    console.log(`### EvaluateMappingTemplate result evaluation result:\n${result.evaluationResult}`);

    const appSyncContext = extractContextFromMappingResult(result.evaluationResult!);
    expect(appSyncContext).toBeDefined();
    const authFilter = appSyncContext.stash.authFilter;
    expect(authFilter).toBeDefined();
    expect(authFilter).toEqual({
      or: [
        {
          owner: {
            eq: '1234-5678-90abcdef::my-username',
          },
        },
        {
          owner: {
            eq: '1234-5678-90abcdef',
          },
        },
        {
          owner: {
            eq: 'my-username',
          },
        },
      ],
    });
    console.log(`### Auth filter extracted from EvaluateMappingTemplate result:\n${JSON.stringify(authFilter, null, 2)}`);

    const authFilterJsonExpr = amplifyAuthExprToJsonExpr(authFilter);

    const identity = amplifyContext.identity as AppSyncIdentityCognitoUserPools;

    const principal = {
      sub: identity.sub!,
      username: identity.username!,
      subUsername: `${identity.sub}::${identity.username}`,
    };

    const commandPath = path.resolve(path.join(__dirname, '../../cedar-util/amplify_data_authz'));
    if (!fs.existsSync(commandPath)) {
      throw new Error(`Command not found: ${commandPath}`);
    }
    const cedarRequestPath = path.resolve(path.join(__dirname, 'request.json'));
    const request = {
      principal: `AmplifyApi::AmplifyCognitoUserPoolsUser::"${identity.sub!}"`,
      action: `AmplifyApi::Action::"${typeName}.${fieldName}"`,
    };
    fs.writeFileSync(cedarRequestPath, JSON.stringify(request, null, 2));

    const cedarCommandResult = cp.spawnSync(commandPath, [
      '-s',
      cedarSchemaPath,
      '-p',
      cedarPolicyPath,
      '-e',
      cedarEntitiesPath,
      '-r',
      cedarRequestPath,
    ]);

    expect(cedarCommandResult.status).toBe(0);

    const cedarPartialEvaluation = JSON.parse(cedarCommandResult.stdout.toString());
    console.log(`### Cedar partial evaluation:\n${JSON.stringify(cedarPartialEvaluation, null, 2)}`);

    const cedarJsonExpr = cedarExprToJsonExpr(cedarPartialEvaluation.residuals![0].conditions[0].body, { principal });

    // A Cedar policy includes front matter that defines a static 'true' condition and the entity being processed. We can ignore it in
    // favor of just the unfulfilled policy conditions.
    const partial = (cedarJsonExpr as any)['and'][2];
    expect(partial).toEqual(authFilterJsonExpr);
    console.log(`### Internal representation matches between Amplify and Cedar:\n${JSON.stringify(partial, null, 2)}`);
  });
});
