import {
  initJSProjectWithProfile,
  deleteProject,
  amplifyPush,
  addApiWithBlankSchema,
  updateApiSchema,
  createNewProjectDir,
  deleteProjectDir,
  getProjectMeta,
} from 'amplify-category-api-e2e-core';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import gql from 'graphql-tag';

(global as any).fetch = require('node-fetch');
(global as any).WebSocket = require('ws');

const projectName = 'indexprojection';
const providerName = 'awscloudformation';

describe('Index Projection Tests', () => {
  let projRoot: string;

  beforeEach(async () => {
    projRoot = await createNewProjectDir(projectName);
    await initJSProjectWithProfile(projRoot, { name: projectName });
    await addApiWithBlankSchema(projRoot, { transformerVersion: 2 });
  });

  afterEach(async () => {
    await deleteProject(projRoot);
    deleteProjectDir(projRoot);
  });

  it('creates GSI with KEYS_ONLY projection and queries successfully', async () => {
    updateApiSchema(projRoot, projectName, 'index_projection_keys_only.graphql');
    await amplifyPush(projRoot);

    const meta = getProjectMeta(projRoot);
    const region = meta.providers[providerName].Region as string;
    const { output } = meta.api[projectName];
    const url = output.GraphQLAPIEndpointOutput as string;
    const apiKey = output.GraphQLAPIKeyOutput as string;

    const api = new AWSAppSyncClient({ url, region, disableOffline: true, auth: { type: AUTH_TYPE.API_KEY, apiKey } });

    await api.mutate({
      mutation: gql`mutation CreateProduct($input: CreateProductInput!) { createProduct(input: $input) { id name category } }`,
      fetchPolicy: 'no-cache',
      variables: { input: { name: 'Laptop', category: 'Electronics' } },
    });

    const result = await api.query({
      query: gql`query ProductsByCategory($category: String!) { productsByCategory(category: $category) { items { id category } } }`,
      fetchPolicy: 'no-cache',
      variables: { category: 'Electronics' },
    });

    expect((result as any).data.productsByCategory.items.length).toEqual(1);
    expect((result as any).data.productsByCategory.items[0].category).toEqual('Electronics');
  });

  it('creates GSI with INCLUDE projection and queries projected fields', async () => {
    updateApiSchema(projRoot, projectName, 'index_projection_include.graphql');
    await amplifyPush(projRoot);

    const meta = getProjectMeta(projRoot);
    const region = meta.providers[providerName].Region as string;
    const { output } = meta.api[projectName];
    const url = output.GraphQLAPIEndpointOutput as string;
    const apiKey = output.GraphQLAPIKeyOutput as string;

    const api = new AWSAppSyncClient({ url, region, disableOffline: true, auth: { type: AUTH_TYPE.API_KEY, apiKey } });

    await api.mutate({
      mutation: gql`mutation CreateProduct($input: CreateProductInput!) { createProduct(input: $input) { id name category price } }`,
      fetchPolicy: 'no-cache',
      variables: { input: { name: 'Phone', category: 'Electronics', price: 999.99 } },
    });

    const result = await api.query({
      query: gql`query ProductsByCategory($category: String!) { productsByCategory(category: $category) { items { id category name price } } }`,
      fetchPolicy: 'no-cache',
      variables: { category: 'Electronics' },
    });

    expect((result as any).data.productsByCategory.items.length).toEqual(1);
    expect((result as any).data.productsByCategory.items[0].name).toEqual('Phone');
    expect((result as any).data.productsByCategory.items[0].price).toEqual(999.99);
  });

  it('creates GSI with ALL projection (default behavior)', async () => {
    updateApiSchema(projRoot, projectName, 'index_projection_all.graphql');
    await amplifyPush(projRoot);

    const meta = getProjectMeta(projRoot);
    const region = meta.providers[providerName].Region as string;
    const { output } = meta.api[projectName];
    const url = output.GraphQLAPIEndpointOutput as string;
    const apiKey = output.GraphQLAPIKeyOutput as string;

    const api = new AWSAppSyncClient({ url, region, disableOffline: true, auth: { type: AUTH_TYPE.API_KEY, apiKey } });

    await api.mutate({
      mutation: gql`mutation CreateProduct($input: CreateProductInput!) { createProduct(input: $input) { id name category price inStock } }`,
      fetchPolicy: 'no-cache',
      variables: { input: { name: 'Tablet', category: 'Electronics', price: 499.99, inStock: true } },
    });

    const result = await api.query({
      query: gql`query ProductsByCategory($category: String!) { productsByCategory(category: $category) { items { id category name price inStock } } }`,
      fetchPolicy: 'no-cache',
      variables: { category: 'Electronics' },
    });

    expect((result as any).data.productsByCategory.items.length).toEqual(1);
    expect((result as any).data.productsByCategory.items[0].inStock).toEqual(true);
  });
});
