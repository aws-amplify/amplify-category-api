/* eslint-disable */
import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import {
  DDB_DEFAULT_DATASOURCE_STRATEGY,
  GraphQLTransform,
  constructDataSourceStrategies,
  validateModelSchema,
} from '@aws-amplify/graphql-transformer-core';
import { AppSyncAuthConfiguration, ModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { DocumentNode, ObjectTypeDefinitionNode, parse } from 'graphql';
import { DeploymentResources, mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { HasOneTransformer, ManyToManyTransformer } from '..';
import { hasGeneratedDirective, hasGeneratedField } from './test-helpers';

test('fails if @manyToMany was used on an object that is not a model type', () => {
  const inputSchema = `
    type Foo {
      id: ID!
      bars: [Bar] @manyToMany(relationName: "FooBar")
    }

    type Bar @model {
      id: ID!
      foos: [Foo] @manyToMany(relationName: "FooBar")
    }`;
  const transformer = createTransformer();

  expect(() => transformer.transform(inputSchema)).toThrow(`@manyToMany must be on an @model object type field.`);
});

test('fails if the related type does not exist', () => {
  const inputSchema = `
    type Foo @model {
      id: ID!
      bars: [Baz] @manyToMany(relationName: "FooBar")
    }

    type Bar @model {
      id: ID!
      foos: [Foo] @manyToMany(relationName: "FooBar")
    }`;
  const transformer = createTransformer();

  expect(() => transformer.transform(inputSchema)).toThrow('Unknown type "Baz". Did you mean "Bar"?');
});

test('fails if used on a non-list type', () => {
  const inputSchema = `
    type Foo @model {
      id: ID!
      bars: Bar @manyToMany(relationName: "FooBar")
    }

    type Bar @model {
      id: ID!
      foos: [Foo] @manyToMany(relationName: "FooBar")
    }`;
  const transformer = createTransformer();

  expect(() => transformer.transform(inputSchema)).toThrow('@manyToMany must be used with a list.');
});

test('fails if a relation is used in less than two places', () => {
  const inputSchema = `
    type Foo @model {
      id: ID!
      bars: [Bar]
    }

    type Bar @model {
      id: ID!
      foos: [Foo] @manyToMany(relationName: "FooBar")
    }`;
  const transformer = createTransformer();

  expect(() => transformer.transform(inputSchema)).toThrow(`@manyToMany relation 'FooBar' must be used in exactly two locations.`);
});

test('fails if a relation is used in more than two places', () => {
  const inputSchema = `
    type Foo @model {
      id: ID!
      bars: [Bar] @manyToMany(relationName: "FooBar")
    }

    type Baz @model {
      id: ID!
      bars: [Bar] @manyToMany(relationName: "FooBar")
    }

    type Bar @model {
      id: ID!
      foos: [Foo] @manyToMany(relationName: "FooBar")
    }`;
  const transformer = createTransformer();

  expect(() => transformer.transform(inputSchema)).toThrow(`@manyToMany relation 'FooBar' must be used in exactly two locations.`);
});

test('fails if a relation name conflicts with an existing type name', () => {
  const inputSchema = `
    type Foo @model {
      id: ID!
      bars: [Bar] @manyToMany(relationName: "foo   Bar")
    }

    type FooBar {
      id: ID!
    }

    type Bar @model {
      id: ID!
      foos: [Foo] @manyToMany(relationName: "foo   Bar")
    }`;
  const transformer = createTransformer();

  expect(() => transformer.transform(inputSchema)).toThrow(
    `@manyToMany relation name 'FooBar' (derived from 'foo   Bar') already exists as a type in the schema.`,
  );
});

test('fails if first half of relation uses the wrong type', () => {
  const inputSchema = `
    type Foo @model {
      id: ID!
      bars: [Baz] @manyToMany(relationName: "FooBar")
    }

    type Baz @model {
      id: ID!
    }

    type Bar @model {
      id: ID!
      foos: [Foo] @manyToMany(relationName: "FooBar")
    }`;
  const transformer = createTransformer();

  expect(() => transformer.transform(inputSchema)).toThrow(`@manyToMany relation 'FooBar' expects 'Baz' but got 'Bar'.`);
});

test('fails if second half of relation uses the wrong type', () => {
  const inputSchema = `
    type Foo @model {
      id: ID!
      bars: [Bar] @manyToMany(relationName: "FooBar")
    }

    type Baz @model {
      id: ID!
    }

    type Bar @model {
      id: ID!
      foos: [Baz] @manyToMany(relationName: "FooBar")
    }`;
  const transformer = createTransformer();

  expect(() => transformer.transform(inputSchema)).toThrow(`@manyToMany relation 'FooBar' expects 'Baz' but got 'Foo'.`);
});

test('fails if used on a SQL model', () => {
  const inputSchema = `
    type Foo @model {
      id: ID! @primaryKey
      bars: [Bar] @manyToMany(relationName: "FooBar")
    }

    type Bar @model {
      id: ID! @primaryKey
      foos: [Foo] @manyToMany(relationName: "FooBar")
    }`;

  const mySqlStrategy = mockSqlDataSourceStrategy();

  const dataSourceStrategies = constructDataSourceStrategies(inputSchema, mySqlStrategy);
  const transformer = createTransformer(undefined, dataSourceStrategies);
  expect(() => transformer.transform(inputSchema)).toThrow('@manyToMany directive cannot be used on a SQL model.');
});

test('valid schema', () => {
  const inputSchema = `
    type Foo @model {
      id: ID!
      bars: [Bar] @manyToMany(relationName: "FooBar")
    }

    type Bar @model {
      id: ID!
      foos: [Foo] @manyToMany(relationName: "FooBar")
    }`;
  const transformer = createTransformer();
  const out = transformer.transform(inputSchema);
  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  expect(out.schema).toMatchSnapshot();
  expect(out.resolvers).toMatchSnapshot();
});

test('one of the models with sort key', () => {
  const inputSchema = `
    type ModelA @model {
      id: ID! @primaryKey(sortKeyFields: ["sortId"])
      sortId: ID!
      models: [ModelB] @manyToMany(relationName: "ModelAModelB")
    }

    type ModelB @model {
      id: ID!
      models: [ModelA] @manyToMany(relationName: "ModelAModelB")
    }`;
  const transformer = createTransformer();
  const out = transformer.transform(inputSchema);
  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  expect(out.schema).toMatchSnapshot();
  expectObjectAndFields(schema, 'ModelAModelB', ['modelAID', 'modelAsortId', 'modelBID']);
});

test('both models with sort key', () => {
  const inputSchema = `
    type ModelA @model {
      id: ID! @primaryKey(sortKeyFields: ["sortId"])
      sortId: ID!
      models: [ModelB] @manyToMany(relationName: "ModelAModelB")
    }

    type ModelB @model {
      id: ID! @primaryKey(sortKeyFields: ["sortId"])
      sortId: ID!
      models: [ModelA] @manyToMany(relationName: "ModelAModelB")
    }`;
  const transformer = createTransformer();
  const out = transformer.transform(inputSchema);
  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  expect(out.schema).toMatchSnapshot();
  expectObjectAndFields(schema, 'ModelAModelB', ['modelAID', 'modelAsortId', 'modelBID', 'modelBsortId']);
  expect(out.resolvers).toMatchSnapshot();
});

test('models with multiple sort keys', () => {
  const inputSchema = `
    type ModelA @model {
      id: ID! @primaryKey(sortKeyFields: ["sortId", "secondSortId"])
      sortId: ID!
      secondSortId: ID!
      models: [ModelB] @manyToMany(relationName: "ModelAModelB")
    }

    type ModelB @model {
      id: ID! @primaryKey(sortKeyFields: ["sortId"])
      sortId: ID!
      models: [ModelA] @manyToMany(relationName: "ModelAModelB")
    }`;
  const transformer = createTransformer();
  const out = transformer.transform(inputSchema);
  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  expect(out.schema).toMatchSnapshot();
  expectObjectAndFields(schema, 'ModelAModelB', ['modelAID', 'modelAsortId', 'modelAsecondSortId', 'modelBID', 'modelBsortId']);
});

test('join table inherits auth from first table', () => {
  const inputSchema = `
    type Foo @model @auth(rules: [{ allow: public, provider: apiKey }]) {
      id: ID!
      bars: [Bar] @manyToMany(relationName: "FooBar")
    }
    type Bar @model {
      id: ID!
      foos: [Foo] @manyToMany(relationName: "FooBar")
    }`;
  const transformer = createTransformer();
  const out = transformer.transform(inputSchema);
  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  expect(out.resolvers['Query.getFooBar.auth.1.req.vtl']).toEqual(out.resolvers['Query.getFoo.auth.1.req.vtl']);
  expect(out.resolvers['Query.getFooBar.postAuth.1.req.vtl']).toEqual(out.resolvers['Query.getFoo.postAuth.1.req.vtl']);
  expect(out.resolvers['Query.getFooBar.res.vtl']).toEqual(out.resolvers['Query.getFoo.res.vtl']);
  expect(out.resolvers['Query.listFooBars.auth.1.req.vtl']).toEqual(out.resolvers['Query.listFoos.auth.1.req.vtl']);
  expect(out.resolvers['Query.listFooBars.postAuth.1.req.vtl']).toEqual(out.resolvers['Query.listFoos.postAuth.1.req.vtl']);
  expect(
    out.resolvers['Mutation.createFooBar.auth.1.req.vtl'].replace('#set( $allowedFields = ["id","fooID","barID","foo","bar"] )', ''),
  ).toEqual(out.resolvers['Mutation.createFoo.auth.1.req.vtl'].replace('#set( $allowedFields = ["id","bars"] )', ''));
  expect(out.resolvers['Mutation.createFooBar.postAuth.1.req.vtl']).toEqual(out.resolvers['Mutation.createFoo.postAuth.1.req.vtl']);
  expect(out.resolvers['Mutation.deleteFooBar.auth.1.req.vtl']).toEqual(out.resolvers['Mutation.deleteFoo.auth.1.req.vtl']);
  expect(out.resolvers['Mutation.deleteFooBar.postAuth.1.req.vtl']).toEqual(out.resolvers['Mutation.deleteFoo.postAuth.1.req.vtl']);
  expect(out.resolvers['Mutation.deleteFooBar.auth.1.res.vtl']).toEqual(out.resolvers['Mutation.deleteFoo.auth.1.res.vtl']);
  expect(out.resolvers['Mutation.deleteFooBar.req.vtl']).toEqual(out.resolvers['Mutation.deleteFoo.req.vtl']);
  expect(out.resolvers['Mutation.deleteFooBar.res.vtl']).toEqual(out.resolvers['Mutation.deleteFoo.res.vtl']);
  expect(out.resolvers['Mutation.updateFooBar.auth.1.req.vtl']).toEqual(out.resolvers['Mutation.updateFoo.auth.1.req.vtl']);
  expect(out.resolvers['Mutation.updateFooBar.postAuth.1.req.vtl']).toEqual(out.resolvers['Mutation.updateFoo.postAuth.1.req.vtl']);
  expect(
    out.resolvers['Mutation.updateFooBar.auth.1.res.vtl']
      .replace('#set( $allowedFields = ["id","fooID","barID","foo","bar"] )', '')
      .replace('#set( $nullAllowedFields = ["id","fooID","barID","foo","bar"] )', ''),
  ).toEqual(
    out.resolvers['Mutation.updateFoo.auth.1.res.vtl']
      .replace('#set( $allowedFields = ["id","bars"] )', '')
      .replace('#set( $nullAllowedFields = ["id","bars"] )', ''),
  );
  expect(out.resolvers['Mutation.updateFooBar.req.vtl']).toEqual(out.resolvers['Mutation.updateFoo.req.vtl']);
  expect(out.resolvers['Mutation.updateFooBar.res.vtl']).toEqual(out.resolvers['Mutation.updateFoo.res.vtl']);
});

test('join table inherits auth from second table', () => {
  const inputSchema = `
    type Foo @model {
      id: ID!
      bars: [Bar] @manyToMany(relationName: "FooBar")
    }
    type Bar @model @auth(rules: [{ allow: public, provider: apiKey }]) {
      id: ID!
      foos: [Foo] @manyToMany(relationName: "FooBar")
    }`;
  const transformer = createTransformer();
  const out = transformer.transform(inputSchema);
  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  expect(out.resolvers['Query.getFooBar.auth.1.req.vtl']).toEqual(out.resolvers['Query.getBar.auth.1.req.vtl']);
  expect(out.resolvers['Query.getFooBar.postAuth.1.req.vtl']).toEqual(out.resolvers['Query.getBar.postAuth.1.req.vtl']);
  expect(out.resolvers['Query.getFooBar.res.vtl']).toEqual(out.resolvers['Query.getBar.res.vtl']);
  expect(out.resolvers['Query.listFooBars.auth.1.req.vtl']).toEqual(out.resolvers['Query.listBars.auth.1.req.vtl']);
  expect(out.resolvers['Query.listFooBars.postAuth.1.req.vtl']).toEqual(out.resolvers['Query.listBars.postAuth.1.req.vtl']);
  expect(
    out.resolvers['Mutation.createFooBar.auth.1.req.vtl'].replace('#set( $allowedFields = ["id","fooID","barID","foo","bar"] )', ''),
  ).toEqual(out.resolvers['Mutation.createBar.auth.1.req.vtl'].replace('#set( $allowedFields = ["id","foos"] )', ''));
  expect(out.resolvers['Mutation.createFooBar.postAuth.1.req.vtl']).toEqual(out.resolvers['Mutation.createBar.postAuth.1.req.vtl']);
  expect(out.resolvers['Mutation.deleteFooBar.auth.1.req.vtl']).toEqual(out.resolvers['Mutation.deleteBar.auth.1.req.vtl']);
  expect(out.resolvers['Mutation.deleteFooBar.postAuth.1.req.vtl']).toEqual(out.resolvers['Mutation.deleteBar.postAuth.1.req.vtl']);
  expect(out.resolvers['Mutation.deleteFooBar.auth.1.res.vtl']).toEqual(out.resolvers['Mutation.deleteBar.auth.1.res.vtl']);
  expect(out.resolvers['Mutation.deleteFooBar.req.vtl']).toEqual(out.resolvers['Mutation.deleteBar.req.vtl']);
  expect(out.resolvers['Mutation.deleteFooBar.res.vtl']).toEqual(out.resolvers['Mutation.deleteBar.res.vtl']);
  expect(out.resolvers['Mutation.updateFooBar.auth.1.req.vtl']).toEqual(out.resolvers['Mutation.updateBar.auth.1.req.vtl']);
  expect(out.resolvers['Mutation.updateFooBar.postAuth.1.req.vtl']).toEqual(out.resolvers['Mutation.updateBar.postAuth.1.req.vtl']);
  expect(
    out.resolvers['Mutation.updateFooBar.auth.1.res.vtl']
      .replace('#set( $allowedFields = ["id","fooID","barID","foo","bar"] )', '')
      .replace('#set( $nullAllowedFields = ["id","fooID","barID","foo","bar"] )', ''),
  ).toEqual(
    out.resolvers['Mutation.updateBar.auth.1.res.vtl']
      .replace('#set( $allowedFields = ["id","foos"] )', '')
      .replace('#set( $nullAllowedFields = ["id","foos"] )', ''),
  );
  expect(out.resolvers['Mutation.updateFooBar.req.vtl']).toEqual(out.resolvers['Mutation.updateBar.req.vtl']);
  expect(out.resolvers['Mutation.updateFooBar.res.vtl']).toEqual(out.resolvers['Mutation.updateBar.res.vtl']);
});

test('join table inherits auth from both tables', () => {
  const inputSchema = `
    type Foo @model @auth(rules: [{ allow: public, provider: iam }]) {
      id: ID!
      bars: [Bar] @manyToMany(relationName: "FooBar")
    }
    type Bar @model @auth(rules: [{ allow: public, provider: apiKey }]) {
      id: ID!
      foos: [Foo] @manyToMany(relationName: "FooBar")
    }`;
  const transformer = createTransformer();
  const out = transformer.transform(inputSchema);
  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  expect(out.resolvers['Query.getFooBar.auth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Query.getFooBar.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Query.getFooBar.res.vtl']).toMatchSnapshot();
  expect(out.resolvers['Query.listFooBars.auth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Query.listFooBars.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.createFooBar.auth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.createFooBar.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.deleteFooBar.auth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.deleteFooBar.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.deleteFooBar.auth.1.res.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.deleteFooBar.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.deleteFooBar.res.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.updateFooBar.auth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.updateFooBar.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.updateFooBar.auth.1.res.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.updateFooBar.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.updateFooBar.res.vtl']).toMatchSnapshot();
});

test('join table inherits auth from tables with similar rules', () => {
  const inputSchema = `
    type Foo @model @auth(rules: [{ allow: owner }, { allow: private, provider: iam }]) {
      id: ID!
      bars: [Bar] @manyToMany(relationName: "FooBar")
    }
    type Bar @model @auth(rules: [{ allow: owner }, { allow: public, provider: apiKey }]) {
      id: ID!
      foos: [Foo] @manyToMany(relationName: "FooBar")
    }`;
  const transformer = createTransformer({
    defaultAuthentication: {
      authenticationType: 'API_KEY',
    },
    additionalAuthenticationProviders: [{ authenticationType: 'AWS_IAM' }, { authenticationType: 'AMAZON_COGNITO_USER_POOLS' }],
  });
  const out = transformer.transform(inputSchema);
  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);

  expect(out.resolvers['Query.getFooBar.auth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Query.getFooBar.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Query.getFooBar.res.vtl']).toMatchSnapshot();
  expect(out.resolvers['Query.listFooBars.auth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Query.listFooBars.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.createFooBar.auth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.createFooBar.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.deleteFooBar.auth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.deleteFooBar.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.deleteFooBar.auth.1.res.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.deleteFooBar.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.deleteFooBar.res.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.updateFooBar.auth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.updateFooBar.postAuth.1.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.updateFooBar.auth.1.res.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.updateFooBar.req.vtl']).toMatchSnapshot();
  expect(out.resolvers['Mutation.updateFooBar.res.vtl']).toMatchSnapshot();
});

test('creates join table with implicitly defined primary keys', () => {
  const inputSchema = `
    type Foo @model {
      fooName: String
      bars: [Bar] @manyToMany(relationName: "FooBar")
    }
    type Bar @model {
      barName: String
      foos: [Foo] @manyToMany(relationName: "FooBar")
    }`;
  const transformer = createTransformer();
  const out = transformer.transform(inputSchema);
  expect(out).toBeDefined();
  const schema = parse(out.schema);
  validateModelSchema(schema);
});

describe('Pre Processing Many To Many Tests', () => {
  let transformer: {
    transform: (inputSchema: string) => DeploymentResources;
    preProcessSchema: (schema: DocumentNode) => DocumentNode;
  };

  beforeEach(() => {
    transformer = createTransformer();
  });

  test('Should generate intermediate model in standard case with all fields', () => {
    const schema = `
    type Recipe @model {
      id: ID!
      recipeName: String
      ingredients: [Ingredient] @manyToMany(relationName: "RecipeIngredients")
    }
    
    type Ingredient @model {
      id: ID!
      ingredientName: String
      recipes: [Recipe] @manyToMany(relationName: "RecipeIngredients")
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    expect(hasGeneratedField(updatedSchemaDoc, 'RecipeIngredients', 'id')).toBeTruthy();
    expect(hasGeneratedField(updatedSchemaDoc, 'RecipeIngredients', 'recipeID')).toBeTruthy();
    expect(hasGeneratedField(updatedSchemaDoc, 'RecipeIngredients', 'ingredientID')).toBeTruthy();
    expect(hasGeneratedField(updatedSchemaDoc, 'RecipeIngredients', 'recipe')).toBeTruthy();
    expect(hasGeneratedField(updatedSchemaDoc, 'RecipeIngredients', 'ingredient')).toBeTruthy();
  });

  test('Should generate hasMany directives on source types', () => {
    const schema = `
    type Recipe @model {
      id: ID!
      recipeName: String
      ingredients: [Ingredient] @manyToMany(relationName: "RecipeIngredients")
    }
    
    type Ingredient @model {
      id: ID!
      ingredientName: String
      recipes: [Recipe] @manyToMany(relationName: "RecipeIngredients")
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    const hasManyIngredientsMap = new Map<string, string | Array<string>>([
      ['indexName', 'byRecipe'],
      ['fields', ['id']],
    ]);
    const hasManyRecipesMap = new Map<string, string | Array<string>>([
      ['indexName', 'byIngredient'],
      ['fields', ['id']],
    ]);
    expect(hasGeneratedDirective(updatedSchemaDoc, 'Recipe', 'ingredients', 'hasMany', hasManyIngredientsMap)).toBeTruthy();
    expect(hasGeneratedDirective(updatedSchemaDoc, 'Ingredient', 'recipes', 'hasMany', hasManyRecipesMap)).toBeTruthy();
  });

  test('Should generate correct hasMany directives for sort keys', () => {
    const schema = `
    type Recipe @model {
      id: ID! @primaryKey(sortKeyFields: ["recipeName"])
      recipeName: String
      ingredients: [Ingredient] @manyToMany(relationName: "RecipeIngredients")
    }
    
    type Ingredient @model {
      id: ID! @primaryKey(sortKeyFields: ["ingredientName"])
      ingredientName: String
      recipes: [Recipe] @manyToMany(relationName: "RecipeIngredients")
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    const hasManyIngredientsMap = new Map<string, string | Array<string>>([
      ['indexName', 'byRecipe'],
      ['fields', ['id', 'recipeName']],
    ]);
    const hasManyRecipesMap = new Map<string, string | Array<string>>([
      ['indexName', 'byIngredient'],
      ['fields', ['id', 'ingredientName']],
    ]);
    expect(hasGeneratedDirective(updatedSchemaDoc, 'Recipe', 'ingredients', 'hasMany', hasManyIngredientsMap)).toBeTruthy();
    expect(hasGeneratedDirective(updatedSchemaDoc, 'Ingredient', 'recipes', 'hasMany', hasManyRecipesMap)).toBeTruthy();
  });

  test('Should generate correct index directives for sort keys', () => {
    const schema = `
    type Recipe @model {
      id: ID! @primaryKey(sortKeyFields: ["recipeName"])
      recipeName: String
      ingredients: [Ingredient] @manyToMany(relationName: "RecipeIngredients")
    }
    
    type Ingredient @model {
      id: ID! @primaryKey(sortKeyFields: ["ingredientName"])
      ingredientName: String
      recipes: [Recipe] @manyToMany(relationName: "RecipeIngredients")
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    const recipeIndexArgsMap = new Map<string, string | Array<string>>([
      ['name', 'byRecipe'],
      ['sortKeyFields', ['reciperecipeName']],
    ]);
    const ingredientIndexArgsMap = new Map<string, string | Array<string>>([
      ['name', 'byIngredient'],
      ['sortKeyFields', ['ingredientingredientName']],
    ]);
    expect(hasGeneratedDirective(updatedSchemaDoc, 'RecipeIngredients', 'recipeID', 'index', recipeIndexArgsMap)).toBeTruthy();
    expect(hasGeneratedDirective(updatedSchemaDoc, 'RecipeIngredients', 'ingredientID', 'index', ingredientIndexArgsMap)).toBeTruthy();
    expect(hasGeneratedField(updatedSchemaDoc, 'RecipeIngredients', 'reciperecipeName', 'String'));
    expect(hasGeneratedField(updatedSchemaDoc, 'RecipeIngredients', 'ingredientingredientName', 'String'));
  });

  test('Should generate correct hasOne directives', () => {
    const schema = `
    type Recipe @model {
      id: ID!
      mealName: String
      ingredients: [Ingredient] @manyToMany(relationName: "RecipeIngredients")
    }
    
    type Ingredient @model {
      id: ID!
      componentName: String
      recipes: [Recipe] @manyToMany(relationName: "RecipeIngredients")
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    const recipeBelongsToArgsMap = new Map<string, string | Array<string>>([['fields', ['recipeID']]]);
    const ingredientBelongsToArgsMap = new Map<string, string | Array<string>>([['fields', ['ingredientID']]]);
    expect(hasGeneratedDirective(updatedSchemaDoc, 'RecipeIngredients', 'recipe', 'hasOne', recipeBelongsToArgsMap)).toBeTruthy();
    expect(hasGeneratedDirective(updatedSchemaDoc, 'RecipeIngredients', 'ingredient', 'hasOne', ingredientBelongsToArgsMap)).toBeTruthy();
  });

  test('Should generate correct hasOne directives for sort key fields', () => {
    const schema = `
    type Recipe @model {
      id: ID! @primaryKey(sortKeyFields: ["mealName"])
      mealName: String
      ingredients: [Ingredient] @manyToMany(relationName: "RecipeIngredients")
    }
    
    type Ingredient @model {
      id: ID! @primaryKey(sortKeyFields: ["componentName"])
      componentName: String
      recipes: [Recipe] @manyToMany(relationName: "RecipeIngredients")
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));
    const recipeBelongsToArgsMap = new Map<string, string | Array<string>>([['fields', ['recipeID', 'recipemealName']]]);
    const ingredientBelongsToArgsMap = new Map<string, string | Array<string>>([['fields', ['ingredientID', 'ingredientcomponentName']]]);
    expect(hasGeneratedDirective(updatedSchemaDoc, 'RecipeIngredients', 'recipe', 'hasOne', recipeBelongsToArgsMap)).toBeTruthy();
    expect(hasGeneratedDirective(updatedSchemaDoc, 'RecipeIngredients', 'ingredient', 'hasOne', ingredientBelongsToArgsMap)).toBeTruthy();
  });

  test('Should update field type on the source models', () => {
    const schema = `
    type Recipe @model {
      id: ID!
      mealName: String
      ingredients: [Ingredient] @manyToMany(relationName: "RecipeIngredients")
    }
    
    type Ingredient @model {
      id: ID!
      componentName: String
      recipes: [Recipe] @manyToMany(relationName: "RecipeIngredients")
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));

    expect(hasGeneratedField(updatedSchemaDoc, 'Recipe', 'ingredients', 'RecipeIngredients', true)).toBeTruthy();
    expect(hasGeneratedField(updatedSchemaDoc, 'Ingredient', 'recipes', 'RecipeIngredients', true)).toBeTruthy();
  });

  test('Should correctly name fields based on mapsTo', () => {
    const schema = `
    type Foo @model @mapsTo(name: "Recipe") {
      id: ID! @primaryKey(sortKeyFields: ["mealName"])
      mealName: String
      ingredients: [Bar] @manyToMany(relationName: "RecipeIngredients")
    }
    
    type Bar @model @mapsTo(name: "Ingredient") {
      id: ID! @primaryKey(sortKeyFields: ["componentName"])
      componentName: String
      recipes: [Foo] @manyToMany(relationName: "RecipeIngredients")
    }
    `;

    const updatedSchemaDoc = transformer.preProcessSchema(parse(schema));

    expect(hasGeneratedField(updatedSchemaDoc, 'Foo', 'ingredients', 'RecipeIngredients', true)).toBeTruthy();
    expect(hasGeneratedField(updatedSchemaDoc, 'Bar', 'recipes', 'RecipeIngredients', true)).toBeTruthy();

    expect(hasGeneratedField(updatedSchemaDoc, 'RecipeIngredients', 'foo', 'Foo')).toBeTruthy();
    expect(hasGeneratedField(updatedSchemaDoc, 'RecipeIngredients', 'fooID', 'ID')).toBeTruthy();
    expect(hasGeneratedField(updatedSchemaDoc, 'RecipeIngredients', 'bar', 'Foo')).toBeTruthy();
    expect(hasGeneratedField(updatedSchemaDoc, 'RecipeIngredients', 'barID', 'ID')).toBeTruthy();
    expect(hasGeneratedField(updatedSchemaDoc, 'RecipeIngredients', 'foomealName', 'ID')).toBeTruthy();
    expect(hasGeneratedField(updatedSchemaDoc, 'RecipeIngredients', 'barcomponentName', 'ID')).toBeTruthy();
  });
});

function createTransformer(
  overrideAuthConfig?: AppSyncAuthConfiguration,
  overrideDataSourceStrategies?: Record<string, ModelDataSourceStrategy>,
): {
  transform: (schema: string) => DeploymentResources & { logs: any[] };
  preProcessSchema: (schema: DocumentNode) => DocumentNode;
} {
  const authConfig: AppSyncAuthConfiguration = overrideAuthConfig ?? {
    defaultAuthentication: {
      authenticationType: 'API_KEY',
    },
    additionalAuthenticationProviders: [{ authenticationType: 'AWS_IAM' }],
  };
  const authTransformer = new AuthTransformer();
  const modelTransformer = new ModelTransformer();
  const indexTransformer = new IndexTransformer();
  const hasOneTransformer = new HasOneTransformer();
  const primaryKeyTransformer = new PrimaryKeyTransformer();
  const manyToManyTransformer = new ManyToManyTransformer(modelTransformer, indexTransformer, hasOneTransformer, authTransformer);
  const transformers = [
    modelTransformer,
    primaryKeyTransformer,
    indexTransformer,
    hasOneTransformer,
    manyToManyTransformer,
    authTransformer,
  ];
  const transformParameters = {
    shouldDeepMergeDirectiveConfigDefaults: false,
    enableAutoIndexQueryNames: false,
    respectPrimaryKeyAttributesOnConnectionField: false,
    populateOwnerFieldForStaticGroupAuth: false,
  };

  return {
    transform: (schema: string) => {
      const dataSourceStrategies = overrideDataSourceStrategies ?? constructDataSourceStrategies(schema, DDB_DEFAULT_DATASOURCE_STRATEGY);
      return testTransform({
        schema,
        authConfig,
        transformers,
        transformParameters,
        dataSourceStrategies,
      });
    },
    preProcessSchema: (schema: DocumentNode) =>
      new GraphQLTransform({ authConfig, transformers, transformParameters }).preProcessSchema(schema),
  };
}

function expectObjectAndFields(schema: DocumentNode, type: String, fields: String[]) {
  const relationModel = schema.definitions.find(
    (def) => def.kind === 'ObjectTypeDefinition' && def.name.value === type,
  ) as ObjectTypeDefinitionNode;
  expect(relationModel).toBeDefined();
  fields.forEach((field) => {
    expect(relationModel.fields?.find((f) => f.name.value === field)).toBeDefined();
  });
}
/* eslint-enable */
