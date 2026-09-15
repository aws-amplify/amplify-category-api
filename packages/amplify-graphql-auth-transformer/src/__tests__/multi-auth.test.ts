import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { DeploymentResources, getResourceWithKeyPrefix, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AppSyncAuthConfiguration, AppSyncAuthConfigurationOIDCEntry, AppSyncAuthMode } from '@aws-amplify/graphql-transformer-interfaces';
import { DocumentNode, ObjectTypeDefinitionNode, Kind, FieldDefinitionNode, parse, InputValueDefinitionNode } from 'graphql';
import { AuthTransformer } from '../graphql-auth-transformer';
import { expectStashValueLike } from './test-helpers';

const userPoolsDefaultConfig: AppSyncAuthConfiguration = {
  defaultAuthentication: {
    authenticationType: 'AMAZON_COGNITO_USER_POOLS',
  },
  additionalAuthenticationProviders: [],
};

const apiKeyDefaultConfig: AppSyncAuthConfiguration = {
  defaultAuthentication: {
    authenticationType: 'API_KEY',
  },
  additionalAuthenticationProviders: [],
};

const iamDefaultConfig: AppSyncAuthConfiguration = {
  defaultAuthentication: {
    authenticationType: 'AWS_IAM',
  },
  additionalAuthenticationProviders: [],
};

const withAuthModes = (authConfig: AppSyncAuthConfiguration, authModes: AppSyncAuthMode[]): AppSyncAuthConfiguration => {
  const newAuthConfig = {
    defaultAuthentication: {
      authenticationType: authConfig.defaultAuthentication.authenticationType,
    },
    additionalAuthenticationProviders: [],
  };

  authModes.forEach((authMode) => {
    const provider = {
      authenticationType: authMode,
    };
    newAuthConfig.additionalAuthenticationProviders.push(provider as never);
  });

  return newAuthConfig;
};

const apiKeyDirectiveName = 'aws_api_key';
const userPoolsDirectiveName = 'aws_cognito_user_pools';
const iamDirectiveName = 'aws_iam';
const openIdDirectiveName = 'aws_oidc';

const multiAuthDirective =
  '@auth(rules: [{allow: private}, {allow: public}, {allow: private, provider: iam }, {allow: owner, provider: oidc }])';
const ownerAuthDirective = '@auth(rules: [{allow: owner}])';
const ownerWithIAMAuthDirective = '@auth(rules: [{allow: owner, provider: iam }])';
const ownerWithIdentityPoolAuthDirective = '@auth(rules: [{allow: owner, provider: identityPool }])';
const ownerRestrictedPublicAuthDirective = '@auth(rules: [{allow: owner},{allow: public, operations: [read]}])';
const ownerRestrictedIAMPrivateAuthDirective = '@auth(rules: [{allow: owner},{allow: private, operations: [read], provider: iam }])';
const ownerRestrictedIdentityPoolPrivateAuthDirective =
  '@auth(rules: [{allow: owner},{allow: private, operations: [read], provider: identityPool }])';
const groupsAuthDirective = '@auth(rules: [{allow: groups, groups: ["admin"] }])';
const groupsWithApiKeyAuthDirective = '@auth(rules: [{allow: groups, groups: ["admin"]}, {allow: public, operations: [read]}])';
const groupsWithProviderAuthDirective = '@auth(rules: [{allow: groups,groups: ["admin"], provider: iam }])';
const groupsWithProviderIdentityPoolAuthDirective = '@auth(rules: [{allow: groups,groups: ["admin"], provider: identityPool }])';
const ownerOpenIdAuthDirective = '@auth(rules: [{allow: owner, provider: oidc }])';
const privateAuthDirective = '@auth(rules: [{allow: private}])';
const publicIAMAuthDirective = '@auth(rules: [{allow: public, provider: iam }])';
const publicIdentityPoolAuthDirective = '@auth(rules: [{allow: public, provider: identityPool }])';
const privateWithApiKeyAuthDirective = '@auth(rules: [{allow: private, provider: apiKey }])';
const publicAuthDirective = '@auth(rules: [{allow: public}])';
const publicUserPoolsAuthDirective = '@auth(rules: [{allow: public, provider: userPools}])';
const privateAndPublicDirective = '@auth(rules: [{allow: private}, {allow: public}])';
const privateIAMDirective = '@auth(rules: [{allow: private, provider: iam}])';
const privateIdentityPoolDirective = '@auth(rules: [{allow: private, provider: identityPool}])';
// const privateAndPrivateIAMDirective = '@auth(rules: [{allow: private}, {allow: private, provider: iam}])';

const getSchema = (authDirective: string): string => `
    type Post @model ${authDirective} {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }`;

const getSchemaWithFieldAuth = (authDirective: string): string => `
    type Post @model {
        id: ID
        title: String
        createdAt: String
        updatedAt: String
        protected: String ${authDirective}
    }`;

const getSchemaWithTypeAndFieldAuth = (typeAuthDirective: string, fieldAuthDirective: string): string => `
    type Post @model ${typeAuthDirective} {
        id: ID
        title: String
        createdAt: String
        updatedAt: String
        protected: String ${fieldAuthDirective}
    }`;

const getSchemaWithNonModelField = (authDirective: string): string => `
    type Post @model ${authDirective} {
        id: ID!
        title: String!
        location: Location
        status: Status
        createdAt: String
        updatedAt: String
    }

    type Location {
      name: String
      address: Address
    }

    type Address {
      street: String
      city: String
      state: String
      zip: String
    }

    enum Status {
      PUBLISHED,
      DRAFT
    }`;

const getSchemaWithRecursiveNonModelField = (authDirective: string): string => `
    type Post @model ${authDirective} {
      id: ID!
      title: String!
      tags: [Tag]
    }

    type Tag {
      id: ID
      tags: [Tag]
    }
  `;

const getRecursiveSchemaWithDiffModesOnParentType = (authDir1: string, authDir2: string): string => `
  type Post @model ${authDir1} {
    id: ID!
    title: String!
    tags: [Tag]
  }

  type Comment @model ${authDir2} {
    id: ID!
    content: String
    tags: [Tag]
  }

  type Tag {
    id: ID
    tags: [Tag]
  }
  `;

const transform = (authConfig: AppSyncAuthConfiguration, schema: string): DeploymentResources =>
  testTransform({
    schema,
    authConfig,
    transformers: [new ModelTransformer(), new AuthTransformer()],
  });

const getObjectType = (doc: DocumentNode, type: string): ObjectTypeDefinitionNode | undefined =>
  doc.definitions.find((def) => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === type) as
    | ObjectTypeDefinitionNode
    | undefined;

const expectNone = (fieldOrType): void => {
  expect(fieldOrType.directives.length).toEqual(0);
};

const expectOne = (fieldOrType, directiveName): void => {
  expect(fieldOrType.directives.length).toBe(1);
  expect(fieldOrType.directives.find((d) => d.name.value === directiveName)).toBeDefined();
};

const expectTwo = (fieldOrType, directiveNames): void => {
  expect(directiveNames).toBeDefined();
  expect(directiveNames).toHaveLength(2);
  expect(fieldOrType.directives).toHaveLength(2);
  expect(fieldOrType.directives.find((d) => d.name.value === directiveNames[0])).toBeDefined();
  expect(fieldOrType.directives.find((d) => d.name.value === directiveNames[1])).toBeDefined();
};

const expectMultiple = (fieldOrType: ObjectTypeDefinitionNode | FieldDefinitionNode, directiveNames: string[]): void => {
  expect(directiveNames).toBeDefined();
  expect(directiveNames).toHaveLength(directiveNames.length);
  expect(fieldOrType?.directives?.length).toEqual(directiveNames.length);
  directiveNames.forEach((directiveName) => {
    expect(fieldOrType.directives).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: expect.objectContaining({ value: directiveName }),
        }),
      ]),
    );
  });
};

const getField = (type, name): any => type.fields.find((f) => f.name.value === name);

describe('validation tests', () => {
  const validationTest = (authDirective, authConfig, expectedError): void => {
    const schema = getSchema(authDirective);

    const t = (): void => {
      transform(authConfig, schema);
    };

    expect(t).toThrowError(expectedError);
  };

  test('AMAZON_COGNITO_USER_POOLS not configured for project', () => {
    validationTest(
      privateAuthDirective,
      apiKeyDefaultConfig,
      "@auth directive with 'userPools' provider found, but the project has no Cognito User Pools authentication provider configured.",
    );
  });

  test('API_KEY not configured for project', () => {
    validationTest(
      publicAuthDirective,
      userPoolsDefaultConfig,
      "@auth directive with 'apiKey' provider found, but the project has no API Key authentication provider configured.",
    );
  });

  test('AWS_IAM not configured for project', () => {
    validationTest(
      publicIAMAuthDirective,
      userPoolsDefaultConfig,
      "@auth directive with 'iam' provider found, but the project has no IAM authentication provider configured.",
    );
  });

  test('AMAZON_COGNITO_IDENTITY_POOL not configured for project', () => {
    validationTest(
      publicIdentityPoolAuthDirective,
      userPoolsDefaultConfig,
      "@auth directive with 'identityPool' provider found, but the project has no IAM authentication provider configured.",
    );
  });

  test('OPENID_CONNECT not configured for project', () => {
    validationTest(
      ownerOpenIdAuthDirective,
      userPoolsDefaultConfig,
      "@auth directive with 'oidc' provider found, but the project has no OPENID_CONNECT authentication provider configured.",
    );
  });

  test("'group' cannot have 'iam' provider", () => {
    validationTest(
      groupsWithProviderAuthDirective,
      userPoolsDefaultConfig,
      "@auth directive with 'groups' strategy only supports 'userPools' and 'oidc' providers, but found 'iam' assigned.",
    );
  });

  test("'group' cannot have 'identityPool' provider", () => {
    validationTest(
      groupsWithProviderIdentityPoolAuthDirective,
      userPoolsDefaultConfig,
      "@auth directive with 'groups' strategy only supports 'userPools' and 'oidc' providers, but found 'identityPool' assigned.",
    );
  });

  test("'owner' has invalid IAM provider", () => {
    validationTest(
      ownerWithIAMAuthDirective,
      userPoolsDefaultConfig,
      "@auth directive with 'owner' strategy only supports 'userPools' (default) and 'oidc' providers, but found 'iam' assigned.",
    );
  });

  test("'owner' has invalid 'identityPool' provider", () => {
    validationTest(
      ownerWithIdentityPoolAuthDirective,
      userPoolsDefaultConfig,
      "@auth directive with 'owner' strategy only supports 'userPools' (default) and 'oidc' providers, but found 'identityPool' assigned.",
    );
  });

  test("'public' has invalid 'userPools' provider", () => {
    validationTest(
      publicUserPoolsAuthDirective,
      userPoolsDefaultConfig,
      "@auth directive with 'public' strategy only supports 'apiKey' (default) and 'identityPool' providers, but found 'userPools' assigned.",
    );
  });

  test("'private' has invalid 'apiKey' provider", () => {
    validationTest(
      privateWithApiKeyAuthDirective,
      userPoolsDefaultConfig,
      "@auth directive with 'private' strategy only supports 'userPools' (default) and 'identityPool' providers, but found 'apiKey' assigned.",
    );
  });
});

describe('schema generation directive tests', () => {
  const transformTest = (authDirective, authConfig, expectedDirectiveNames?: string[] | undefined): void => {
    const schema = getSchema(authDirective);

    const out = transform(authConfig, schema);

    const schemaDoc = parse(out.schema);

    const postType = getObjectType(schemaDoc, 'Post');

    if (expectedDirectiveNames && expectedDirectiveNames.length > 0) {
      let expectedDirectiveNameCount = 0;

      expectedDirectiveNames.forEach((expectedDirectiveName) => {
        expect(postType?.directives?.find((d) => d.name.value === expectedDirectiveName)).toBeDefined();
        expectedDirectiveNameCount += 1;
      });

      expect(expectedDirectiveNameCount).toEqual(postType?.directives?.length);
    }
  };

  test('When provider is the same as default, then no directive added', () => {
    transformTest(ownerAuthDirective, userPoolsDefaultConfig);
  });

  test('When all providers are configured all of them are added', () => {
    const authConfig = withAuthModes(apiKeyDefaultConfig, ['AMAZON_COGNITO_USER_POOLS', 'AWS_IAM', 'OPENID_CONNECT']);

    (authConfig.additionalAuthenticationProviders[2] as AppSyncAuthConfigurationOIDCEntry).openIDConnectConfig = {
      name: 'Test Provider',
      issuerUrl: 'https://abc.def/',
    };

    // TODO sobkamil: what do we do here?
    transformTest(multiAuthDirective, authConfig, [userPoolsDirectiveName, iamDirectiveName, openIdDirectiveName, apiKeyDirectiveName]);
  });

  test('Operation fields are getting the directive added, when type has the @auth for all operations', () => {
    const schema = getSchema(ownerAuthDirective);

    const out = transform(withAuthModes(apiKeyDefaultConfig, ['AMAZON_COGNITO_USER_POOLS']), schema);
    const schemaDoc = parse(out.schema);
    const queryType = getObjectType(schemaDoc, 'Query');
    const mutationType = getObjectType(schemaDoc, 'Mutation');
    const subscriptionType = getObjectType(schemaDoc, 'Subscription');

    const queryTypeFields = queryType?.fields;
    expect(queryTypeFields).toBeDefined();
    const mutationTypeFields = mutationType?.fields;
    expect(mutationTypeFields).toBeDefined();
    const fields = [...queryTypeFields!, ...mutationTypeFields!];

    fields.forEach((field) => {
      expect(field?.directives?.length).toEqual(1);
      expect(field?.directives?.find((d) => d.name.value === userPoolsDirectiveName)).toBeDefined();
    });

    // Check that owner argument is present when only using owner auth rules
    subscriptionType?.fields?.forEach((field) => {
      expect(field.arguments).toHaveLength(2);
      const ownerArg: InputValueDefinitionNode = field?.arguments![1];
      expect(ownerArg.name.value).toEqual('owner');
      expect(ownerArg.type.kind).toEqual(Kind.NAMED_TYPE);
      const filterArg: InputValueDefinitionNode = field.arguments![0];
      expect(filterArg.name.value).toEqual('filter');
      expect(filterArg.type.kind).toEqual(Kind.NAMED_TYPE);
    });

    // Check that resolvers containing the authMode check block
    const authStepSnippet = '## [Start] Authorization Steps. **';

    expect(out.resolvers['Query.getPost.auth.1.req.vtl']).toContain(authStepSnippet);
    expect(out.resolvers['Query.listPosts.auth.1.req.vtl']).toContain(authStepSnippet);
    expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toContain(authStepSnippet);
    expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toContain(authStepSnippet);
    expect(out.resolvers['Mutation.updatePost.auth.1.res.vtl']).toContain(authStepSnippet);
    expect(out.resolvers['Mutation.deletePost.auth.1.res.vtl']).toContain(authStepSnippet);
  });

  test('Operation fields are getting the directive added, when type has the @auth only for allowed operations', () => {
    const schema = getSchema(ownerRestrictedPublicAuthDirective);

    const out = transform(withAuthModes(apiKeyDefaultConfig, ['AMAZON_COGNITO_USER_POOLS']), schema);
    const schemaDoc = parse(out.schema);
    const queryType = getObjectType(schemaDoc, 'Query');
    const mutationType = getObjectType(schemaDoc, 'Mutation');
    const subscriptionType = getObjectType(schemaDoc, 'Subscription');

    expectTwo(getField(queryType, 'getPost'), ['aws_cognito_user_pools', 'aws_api_key']);
    expectTwo(getField(queryType, 'listPosts'), ['aws_cognito_user_pools', 'aws_api_key']);

    expectOne(getField(mutationType, 'createPost'), 'aws_cognito_user_pools');
    expectOne(getField(mutationType, 'updatePost'), 'aws_cognito_user_pools');
    expectOne(getField(mutationType, 'deletePost'), 'aws_cognito_user_pools');

    const onCreate = getField(subscriptionType, 'onCreatePost');
    expectMultiple(onCreate, ['aws_subscribe', 'aws_api_key', 'aws_cognito_user_pools']);
    expectMultiple(getField(subscriptionType, 'onUpdatePost'), ['aws_subscribe', 'aws_api_key', 'aws_cognito_user_pools']);
    expectMultiple(getField(subscriptionType, 'onDeletePost'), ['aws_subscribe', 'aws_api_key', 'aws_cognito_user_pools']);
    expect(onCreate.arguments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: expect.objectContaining({ value: 'owner' }),
          type: expect.objectContaining({ kind: 'NamedType' }),
        }),
      ]),
    );
  });

  test('Field level @auth is propagated to type and the type related operations', () => {
    const schema = getSchemaWithFieldAuth(ownerRestrictedPublicAuthDirective);

    const out = transform(withAuthModes(apiKeyDefaultConfig, ['AMAZON_COGNITO_USER_POOLS']), schema);
    const schemaDoc = parse(out.schema);
    const queryType = getObjectType(schemaDoc, 'Query');
    const mutationType = getObjectType(schemaDoc, 'Mutation');

    expectTwo(getField(queryType, 'getPost'), ['aws_cognito_user_pools', 'aws_api_key']);
    expectTwo(getField(queryType, 'listPosts'), ['aws_cognito_user_pools', 'aws_api_key']);

    expectOne(getField(mutationType, 'createPost'), 'aws_cognito_user_pools');
    expectOne(getField(mutationType, 'updatePost'), 'aws_cognito_user_pools');
    // since there is only one field allowed on delete it does not have access to delete
    expectNone(getField(mutationType, 'deletePost'));

    // Check that resolvers containing the authMode check block
    const authModeCheckSnippet = '## [Start] Field Authorization Steps. **';
    // resolvers to check is all other resolvers other than protected
    expect(out.resolvers['Post.id.req.vtl']).toContain(authModeCheckSnippet);
    expect(out.resolvers['Post.title.req.vtl']).toContain(authModeCheckSnippet);
    expect(out.resolvers['Post.createdAt.req.vtl']).toContain(authModeCheckSnippet);
    expect(out.resolvers['Post.updatedAt.req.vtl']).toContain(authModeCheckSnippet);
  });

  test("'groups' @auth at field level is propagated to type and the type related operations", () => {
    const schema = getSchemaWithFieldAuth(groupsAuthDirective);

    const out = transform(withAuthModes(apiKeyDefaultConfig, ['AMAZON_COGNITO_USER_POOLS']), schema);
    const schemaDoc = parse(out.schema);
    const queryType = getObjectType(schemaDoc, 'Query');
    const mutationType = getObjectType(schemaDoc, 'Mutation');

    expectOne(getField(queryType, 'getPost'), 'aws_cognito_user_pools');
    expectOne(getField(queryType, 'listPosts'), 'aws_cognito_user_pools');

    expectOne(getField(mutationType, 'createPost'), 'aws_cognito_user_pools');
    expectOne(getField(mutationType, 'updatePost'), 'aws_cognito_user_pools');
    // since there is only one field allowed on delete it does not have access to delete
    expectNone(getField(mutationType, 'deletePost'));

    // Check that resolvers containing the authMode check block
    const authModeCheckSnippet = '## [Start] Field Authorization Steps. **';

    // resolvers to check is all other resolvers other than protected
    expect(out.resolvers['Post.id.req.vtl']).toContain(authModeCheckSnippet);
    expect(out.resolvers['Post.title.req.vtl']).toContain(authModeCheckSnippet);
    expect(out.resolvers['Post.createdAt.req.vtl']).toContain(authModeCheckSnippet);
    expect(out.resolvers['Post.updatedAt.req.vtl']).toContain(authModeCheckSnippet);
  });

  test("'groups' @auth at field level is propagated to type and the type related operations, also default provider for read", () => {
    const schema = getSchemaWithTypeAndFieldAuth(groupsAuthDirective, groupsWithApiKeyAuthDirective);

    const out = transform(withAuthModes(apiKeyDefaultConfig, ['AMAZON_COGNITO_USER_POOLS']), schema);
    const schemaDoc = parse(out.schema);
    const queryType = getObjectType(schemaDoc, 'Query');
    const mutationType = getObjectType(schemaDoc, 'Mutation');

    expectTwo(getField(queryType, 'getPost'), ['aws_cognito_user_pools', 'aws_api_key']);
    expectTwo(getField(queryType, 'listPosts'), ['aws_cognito_user_pools', 'aws_api_key']);

    expectOne(getField(mutationType, 'createPost'), 'aws_cognito_user_pools');
    expectOne(getField(mutationType, 'updatePost'), 'aws_cognito_user_pools');
    expectOne(getField(mutationType, 'deletePost'), 'aws_cognito_user_pools');

    // Check that resolvers containing the authMode group check
    const groupCheckSnippet = '#set( $staticGroupRoles = [{"claim":"cognito:groups","entity":"admin"}] )';

    // resolvers to check is all other resolvers other than protected by the group rule
    expect(out.resolvers['Post.id.req.vtl']).toContain(groupCheckSnippet);
    expect(out.resolvers['Post.title.req.vtl']).toContain(groupCheckSnippet);
    expect(out.resolvers['Post.createdAt.req.vtl']).toContain(groupCheckSnippet);
    expect(out.resolvers['Post.updatedAt.req.vtl']).toContain(groupCheckSnippet);
  });

  test('Nested types without @model not getting directives applied for iam, and no policy is generated', () => {
    const schema = getSchemaWithNonModelField('');

    const out = transform(withAuthModes(iamDefaultConfig, ['AMAZON_COGNITO_USER_POOLS']), schema);
    const schemaDoc = parse(out.schema);

    const locationType = getObjectType(schemaDoc, 'Location');
    const addressType = getObjectType(schemaDoc, 'Address');

    expect(locationType?.directives?.length).toBe(0);
    expect(addressType?.directives?.length).toBe(0);

    const resources = out.rootStack.Resources;
    expect(resources).toBeDefined();
    const authPolicyIdx = Object.keys(resources!).find((r) => r.includes('AuthRolePolicy'));
    expect(authPolicyIdx).not.toBeDefined();
  });

  test('Nested types without @model not getting directives applied for iam, but policy is generated', () => {
    const schema = getSchemaWithNonModelField(privateIAMDirective);

    const out = transform(withAuthModes(iamDefaultConfig, ['AMAZON_COGNITO_USER_POOLS']), schema);
    const schemaDoc = parse(out.schema);

    const locationType = getObjectType(schemaDoc, 'Location');
    const addressType = getObjectType(schemaDoc, 'Address');

    expect(locationType?.directives?.length).toBe(0);
    expect(addressType?.directives?.length).toBe(0);

    // find the key to account for the hash
    const resources = out.rootStack.Resources;
    expect(resources).toBeDefined();
    const authPolicyIdx = Object.keys(resources!).find((r) => r.includes('AuthRolePolicy01'));
    expect(authPolicyIdx).toBeDefined();
    expect(resources![authPolicyIdx!]).toBeDefined();
    const authRolePolicy = resources![authPolicyIdx!];

    const locationPolicy = authRolePolicy.Properties.PolicyDocument.Statement[0].Resource.filter(
      (r) =>
        r['Fn::Sub'] &&
        r['Fn::Sub'].length &&
        r['Fn::Sub'].length === 2 &&
        r['Fn::Sub'][1].typeName &&
        r['Fn::Sub'][1].typeName === 'Location',
    );
    expect(locationPolicy).toHaveLength(1);

    const addressPolicy = authRolePolicy.Properties.PolicyDocument.Statement[0].Resource.filter(
      (r) =>
        r['Fn::Sub'] &&
        r['Fn::Sub'].length &&
        r['Fn::Sub'].length === 2 &&
        r['Fn::Sub'][1].typeName &&
        r['Fn::Sub'][1].typeName === 'Address',
    );
    expect(addressPolicy).toHaveLength(1);
  });

  test('Nested types without @model not getting directives applied for identityPool, but policy is generated', () => {
    const schema = getSchemaWithNonModelField(privateIdentityPoolDirective);

    const out = transform(withAuthModes(iamDefaultConfig, ['AMAZON_COGNITO_USER_POOLS']), schema);
    const schemaDoc = parse(out.schema);

    const locationType = getObjectType(schemaDoc, 'Location');
    const addressType = getObjectType(schemaDoc, 'Address');

    expect(locationType?.directives?.length).toBe(0);
    expect(addressType?.directives?.length).toBe(0);

    // find the key to account for the hash
    const resources = out.rootStack.Resources;
    expect(resources).toBeDefined();
    const authPolicyIdx = Object.keys(resources!).find((r) => r.includes('AuthRolePolicy01'));
    expect(authPolicyIdx).toBeDefined();
    expect(resources![authPolicyIdx!]).toBeDefined();
    const authRolePolicy = resources![authPolicyIdx!];

    const locationPolicy = authRolePolicy.Properties.PolicyDocument.Statement[0].Resource.filter(
      (r) =>
        r['Fn::Sub'] &&
        r['Fn::Sub'].length &&
        r['Fn::Sub'].length === 2 &&
        r['Fn::Sub'][1].typeName &&
        r['Fn::Sub'][1].typeName === 'Location',
    );
    expect(locationPolicy).toHaveLength(1);

    const addressPolicy = authRolePolicy.Properties.PolicyDocument.Statement[0].Resource.filter(
      (r) =>
        r['Fn::Sub'] &&
        r['Fn::Sub'].length &&
        r['Fn::Sub'].length === 2 &&
        r['Fn::Sub'][1].typeName &&
        r['Fn::Sub'][1].typeName === 'Address',
    );
    expect(addressPolicy).toHaveLength(1);
  });

  test('Recursive types with diff auth modes on parent @model types', () => {
    const schema = getRecursiveSchemaWithDiffModesOnParentType(ownerAuthDirective, privateIAMDirective);

    const out = transform(withAuthModes(userPoolsDefaultConfig, ['AWS_IAM']), schema);
    const schemaDoc = parse(out.schema);

    const tagType = getObjectType(schemaDoc, 'Tag');
    const expectedDirectiveNames = [userPoolsDirectiveName, iamDirectiveName];

    expect(tagType).toBeDefined();
    expectMultiple(tagType!, expectedDirectiveNames);
  });

  test('Recursive types with diff auth modes on parent @model types with identityPool', () => {
    const schema = getRecursiveSchemaWithDiffModesOnParentType(ownerAuthDirective, privateIdentityPoolDirective);

    const out = transform(withAuthModes(userPoolsDefaultConfig, ['AWS_IAM']), schema);
    const schemaDoc = parse(out.schema);

    const tagType = getObjectType(schemaDoc, 'Tag');
    const expectedDirectiveNames = [userPoolsDirectiveName, iamDirectiveName];

    expect(tagType).toBeDefined();
    expectMultiple(tagType!, expectedDirectiveNames);
  });

  test('Recursive types without @model', () => {
    const schema = getSchemaWithRecursiveNonModelField(ownerRestrictedIAMPrivateAuthDirective);

    const out = transform(withAuthModes(userPoolsDefaultConfig, ['AWS_IAM']), schema);
    const schemaDoc = parse(out.schema);

    const tagType = getObjectType(schemaDoc, 'Tag');
    const expectedDirectiveNames = [userPoolsDirectiveName, iamDirectiveName];

    expect(tagType).toBeDefined();
    expectMultiple(tagType!, expectedDirectiveNames);
  });

  test('Recursive types without @model with identityPool', () => {
    const schema = getSchemaWithRecursiveNonModelField(ownerRestrictedIdentityPoolPrivateAuthDirective);

    const out = transform(withAuthModes(userPoolsDefaultConfig, ['AWS_IAM']), schema);
    const schemaDoc = parse(out.schema);

    const tagType = getObjectType(schemaDoc, 'Tag');
    const expectedDirectiveNames = [userPoolsDirectiveName, iamDirectiveName];

    expect(tagType).toBeDefined();
    expectMultiple(tagType!, expectedDirectiveNames);
  });

  test('OIDC works with private', () => {
    const cognitoUserPoolAndOidcAuthRules =
      '@auth(rules: [ { allow: private, provider: oidc, operations: [read] } { allow: owner, ownerField: "editors" } { allow: groups, groupsField: "groups"} ])';
    const authConfig = withAuthModes(apiKeyDefaultConfig, ['AMAZON_COGNITO_USER_POOLS', 'OPENID_CONNECT']);

    (authConfig.additionalAuthenticationProviders[1] as AppSyncAuthConfigurationOIDCEntry).openIDConnectConfig = {
      name: 'Test Provider',
      issuerUrl: 'https://abc.def/',
    };
    transformTest(cognitoUserPoolAndOidcAuthRules, authConfig, [userPoolsDirectiveName, openIdDirectiveName]);
  });

  test('Nested types without @model getting directives applied (cognito default, api key additional)', () => {
    const schema = getSchemaWithNonModelField(privateAndPublicDirective);

    const out = transform(withAuthModes(userPoolsDefaultConfig, ['API_KEY']), schema);
    const schemaDoc = parse(out.schema);

    const locationType = getObjectType(schemaDoc, 'Location');
    const addressType = getObjectType(schemaDoc, 'Address');
    const expectedDirectiveNames = [userPoolsDirectiveName, apiKeyDirectiveName] || [];

    let expectedDirectiveNameCount = 0;

    expectedDirectiveNames.forEach((expectedDirectiveName) => {
      expect(locationType?.directives?.find((d) => d.name.value === expectedDirectiveName)).toBeDefined();
      expectedDirectiveNameCount += 1;
    });

    expect(expectedDirectiveNameCount).toEqual(locationType?.directives?.length);

    expectedDirectiveNameCount = 0;

    expectedDirectiveNames.forEach((expectedDirectiveName) => {
      expect(addressType?.directives?.find((d) => d.name.value === expectedDirectiveName)).toBeDefined();
      expectedDirectiveNameCount += 1;
    });

    expect(expectedDirectiveNameCount).toEqual(addressType?.directives?.length);
  });
});

describe('iam checks', () => {
  const identityPoolId = 'us-fake-1:abc';
  const identityPoolStashValue = '$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-fake-1:abc\\"))';

  test('identity pool check gets added when using private rule', () => {
    const schema = getSchema(privateIAMDirective);
    const out = testTransform({
      schema,
      authConfig: iamDefaultConfig,
      synthParameters: { identityPoolId },
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    const createResolver = out.resolvers['Mutation.createPost.auth.1.req.vtl'];
    expect(createResolver).toContain(
      `#if( ($ctx.identity.userArn == $ctx.stash.authRole) || ($ctx.identity.cognitoIdentityPoolId == $ctx.stash.identityPoolId && $ctx.identity.cognitoIdentityAuthType == "authenticated") )`,
    );
    const queryResolver = out.resolvers['Query.listPosts.auth.1.req.vtl'];
    expect(queryResolver).toContain(
      `#if( ($ctx.identity.userArn == $ctx.stash.authRole) || ($ctx.identity.cognitoIdentityPoolId == $ctx.stash.identityPoolId && $ctx.identity.cognitoIdentityAuthType == "authenticated") )`,
    );
    expectStashValueLike(out, 'Post', identityPoolStashValue);
  });

  test('identity pool check does not get added when using public rule', () => {
    const schema = getSchema(publicIAMAuthDirective);
    const out = testTransform({
      schema,
      authConfig: iamDefaultConfig,
      synthParameters: { identityPoolId },
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    const createResolver = out.resolvers['Mutation.createPost.auth.1.req.vtl'];
    expect(createResolver).toContain('#if( $ctx.identity.userArn == $ctx.stash.unauthRole )');
    const queryResolver = out.resolvers['Query.listPosts.auth.1.req.vtl'];
    expect(queryResolver).toContain('#if( $ctx.identity.userArn == $ctx.stash.unauthRole )');
    expectStashValueLike(out, 'Post', identityPoolStashValue);
  });

  test('that admin roles are added when functions have access to the graphql api', () => {
    const adminRoles = ['helloWorldFunction', 'echoMessageFunction'];
    const schema = getSchema(privateIAMDirective);
    const out = testTransform({
      schema,
      authConfig: iamDefaultConfig,
      synthParameters: { adminRoles },
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    const createResolver = out.resolvers['Mutation.createPost.auth.1.req.vtl'];
    expectStashValueLike(out, 'Post', '$util.qr($ctx.stash.put(\\"adminRoles\\", [\\"helloWorldFunction\\",\\"echoMessageFunction\\"]))');
    expect(createResolver).toContain('#foreach( $adminRole in $ctx.stash.adminRoles )');
    expect(createResolver).toMatchSnapshot();
  });

  test('public with IAM provider adds policy for Unauth role', () => {
    const schema = getSchema(publicIAMAuthDirective);
    const authConfig = withAuthModes(userPoolsDefaultConfig, ['AWS_IAM']);
    const out = transform(authConfig, schema);
    const unauthPolicy = getResourceWithKeyPrefix('UnauthRolePolicy', out);
    expect(unauthPolicy).toBeDefined();
  });

  test('the long Todo type should generate policy statements split amongst resources', () => {
    const schema = `
    type TodoWithExtraLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongName @model(subscriptions:null) @auth(rules:[{allow: private, provider: iam}])
    {
      id: ID!
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename001: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename002: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename003: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename004: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename005: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename006: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename007: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename008: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename009: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename010: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename011: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename012: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename013: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename014: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename015: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename016: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename017: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename018: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename019: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename020: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename021: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename022: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename023: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename024: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename025: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename026: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename027: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename028: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename029: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename030: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename031: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename032: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename033: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename034: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename035: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename036: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename037: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename038: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename039: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename040: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename041: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename042: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename043: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename044: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename045: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename046: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename047: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename048: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename049: String! @auth(rules:[{allow: private, provider: iam}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename050: String! @auth(rules:[{allow: private, provider: iam}])
      description: String
    }
    `;
    const authConfig = withAuthModes(apiKeyDefaultConfig, ['AMAZON_COGNITO_USER_POOLS', 'AWS_IAM']);
    const out = transform(authConfig, schema);
    const authPolicy1 = getResourceWithKeyPrefix('AuthRolePolicy01', out);
    const authPolicy2 = getResourceWithKeyPrefix('AuthRolePolicy02', out);
    const authPolicy3 = getResourceWithKeyPrefix('AuthRolePolicy03', out);
    const unauthPolicy = getResourceWithKeyPrefix('UnauthRolePolicy', out);

    expect(authPolicy1).toBeDefined();
    expect(authPolicy2).toBeDefined();
    expect(authPolicy3).toBeDefined();
    expect(unauthPolicy).toBeUndefined();

    expect(authPolicy1.Properties.PolicyDocument.Statement[0].Resource.length).toEqual(25);
    expect(authPolicy2.Properties.PolicyDocument.Statement[0].Resource.length).toEqual(26);
    expect(authPolicy3.Properties.PolicyDocument.Statement[0].Resource.length).toEqual(5);
  });
});

describe('identityPool checks', () => {
  const identityPoolId = 'us-fake-1:abc';
  const identityPoolStashValue = '$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-fake-1:abc\\"))';

  test('identity pool check gets added when using private rule', () => {
    const schema = getSchema(privateIdentityPoolDirective);
    const out = testTransform({
      schema,
      authConfig: iamDefaultConfig,
      synthParameters: { identityPoolId },
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    const createResolver = out.resolvers['Mutation.createPost.auth.1.req.vtl'];
    expect(createResolver).toContain(
      `#if( ($ctx.identity.userArn == $ctx.stash.authRole) || ($ctx.identity.cognitoIdentityPoolId == $ctx.stash.identityPoolId && $ctx.identity.cognitoIdentityAuthType == "authenticated") )`,
    );
    const queryResolver = out.resolvers['Query.listPosts.auth.1.req.vtl'];
    expect(queryResolver).toContain(
      `#if( ($ctx.identity.userArn == $ctx.stash.authRole) || ($ctx.identity.cognitoIdentityPoolId == $ctx.stash.identityPoolId && $ctx.identity.cognitoIdentityAuthType == "authenticated") )`,
    );
    expectStashValueLike(out, 'Post', identityPoolStashValue);
  });

  test('identity pool check does not get added when using public rule', () => {
    const schema = getSchema(publicIdentityPoolAuthDirective);
    const out = testTransform({
      schema,
      authConfig: iamDefaultConfig,
      synthParameters: { identityPoolId },
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    const createResolver = out.resolvers['Mutation.createPost.auth.1.req.vtl'];
    expect(createResolver).toContain('#if( $ctx.identity.userArn == $ctx.stash.unauthRole )');
    const queryResolver = out.resolvers['Query.listPosts.auth.1.req.vtl'];
    expect(queryResolver).toContain('#if( $ctx.identity.userArn == $ctx.stash.unauthRole )');
    expectStashValueLike(out, 'Post', identityPoolStashValue);
  });

  test('that admin roles are added when functions have access to the graphql api', () => {
    const adminRoles = ['helloWorldFunction', 'echoMessageFunction'];
    const schema = getSchema(privateIdentityPoolDirective);
    const out = testTransform({
      schema,
      authConfig: iamDefaultConfig,
      synthParameters: { adminRoles },
      transformers: [new ModelTransformer(), new AuthTransformer()],
    });
    expect(out).toBeDefined();
    const createResolver = out.resolvers['Mutation.createPost.auth.1.req.vtl'];
    expectStashValueLike(out, 'Post', '$util.qr($ctx.stash.put(\\"adminRoles\\", [\\"helloWorldFunction\\",\\"echoMessageFunction\\"]))');
    expect(createResolver).toContain('#foreach( $adminRole in $ctx.stash.adminRoles )');
    expect(createResolver).toMatchSnapshot();
  });

  test('public with IdentityPool provider adds policy for Unauth role', () => {
    const schema = getSchema(publicIdentityPoolAuthDirective);
    const authConfig = withAuthModes(userPoolsDefaultConfig, ['AWS_IAM']);
    const out = transform(authConfig, schema);
    const unauthPolicy = getResourceWithKeyPrefix('UnauthRolePolicy', out);
    expect(unauthPolicy).toBeDefined();
  });

  test('the long Todo type should generate policy statements split amongst resources', () => {
    const schema = `
    type TodoWithExtraLongLongLongLongLongLongLongLongLongLongLongLongLongLongLongName @model(subscriptions:null) @auth(rules:[{allow: private, provider: identityPool}])
    {
      id: ID!
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename001: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename002: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename003: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename004: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename005: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename006: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename007: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename008: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename009: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename010: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename011: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename012: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename013: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename014: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename015: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename016: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename017: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename018: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename019: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename020: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename021: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename022: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename023: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename024: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename025: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename026: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename027: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename028: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename029: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename030: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename031: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename032: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename033: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename034: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename035: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename036: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename037: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename038: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename039: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename040: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename041: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename042: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename043: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename044: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename045: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename046: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename047: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename048: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename049: String! @auth(rules:[{allow: private, provider: identityPool}])
      namenamenamenamenamenamenamenamenamenamenamenamenamenamename050: String! @auth(rules:[{allow: private, provider: identityPool}])
      description: String
    }
    `;
    const authConfig = withAuthModes(apiKeyDefaultConfig, ['AMAZON_COGNITO_USER_POOLS', 'AWS_IAM']);
    const out = transform(authConfig, schema);
    const authPolicy1 = getResourceWithKeyPrefix('AuthRolePolicy01', out);
    const authPolicy2 = getResourceWithKeyPrefix('AuthRolePolicy02', out);
    const authPolicy3 = getResourceWithKeyPrefix('AuthRolePolicy03', out);
    const unauthPolicy = getResourceWithKeyPrefix('UnauthRolePolicy', out);

    expect(authPolicy1).toBeDefined();
    expect(authPolicy2).toBeDefined();
    expect(authPolicy3).toBeDefined();
    expect(unauthPolicy).toBeUndefined();

    expect(authPolicy1.Properties.PolicyDocument.Statement[0].Resource.length).toEqual(25);
    expect(authPolicy2.Properties.PolicyDocument.Statement[0].Resource.length).toEqual(26);
    expect(authPolicy3.Properties.PolicyDocument.Statement[0].Resource.length).toEqual(5);
  });
});
