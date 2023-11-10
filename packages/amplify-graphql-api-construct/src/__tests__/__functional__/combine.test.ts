import * as os from 'os';
import * as cdk from 'aws-cdk-lib';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';
import { AMPLIFY_TABLE_DS_STRATEGY, DEFAULT_TABLE_DS_STRATEGY, MOCK_SCHEMA, makeSqlDataSourceStrategy } from '../mock-definitions';
import { IAmplifyGraphqlDefinition } from '../../types';

describe('AmplifyGraphqlDefinition.combine', () => {
  describe('definition behavior', () => {
    it('combines homogenous DDB default definitions into a definition with one ModelDataSourceStrategy', () => {
      const definition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.ddb);
      const definition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.post.ddb, DEFAULT_TABLE_DS_STRATEGY);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toEqual(`${MOCK_SCHEMA.blog.ddb}${os.EOL}${MOCK_SCHEMA.post.ddb}`);
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({
        Blog: DEFAULT_TABLE_DS_STRATEGY,
        Post: DEFAULT_TABLE_DS_STRATEGY,
      });
    });

    it('combines homogenous DDB Amplify-managed table definitions into a definition with one ModelDataSourceStrategy', () => {
      const definition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.ddb, AMPLIFY_TABLE_DS_STRATEGY);
      const definition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.post.ddb, AMPLIFY_TABLE_DS_STRATEGY);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toEqual(`${MOCK_SCHEMA.blog.ddb}${os.EOL}${MOCK_SCHEMA.post.ddb}`);
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({
        Blog: AMPLIFY_TABLE_DS_STRATEGY,
        Post: AMPLIFY_TABLE_DS_STRATEGY,
      });
    });

    it('combines heterogeneous DDB table definitions into a definition with one ModelDataSourceStrategy', () => {
      const definition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.ddb);
      const definition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.post.ddb, AMPLIFY_TABLE_DS_STRATEGY);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toEqual(`${MOCK_SCHEMA.blog.ddb}${os.EOL}${MOCK_SCHEMA.post.ddb}`);
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({
        Blog: DEFAULT_TABLE_DS_STRATEGY,
        Post: AMPLIFY_TABLE_DS_STRATEGY,
      });
    });

    it('combines heterogeneous SQL table definitions into an API with multiple ModelDataSourceStrategies', () => {
      const sqlStrategy1 = makeSqlDataSourceStrategy('sqlDefinition1');
      const sqlStrategy2 = makeSqlDataSourceStrategy('sqlDefinition2');
      const definition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.sql, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.post.sql, sqlStrategy2);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2]);
      expect(combinedDefinition.schema).toEqual(`${MOCK_SCHEMA.blog.sql}${os.EOL}${MOCK_SCHEMA.post.sql}`);
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({
        Blog: sqlStrategy1,
        Post: sqlStrategy2,
      });
    });

    it('combines heterogeneous definitions for multiple supported db types into an API with multiple ModelDataSourceStrategies', () => {
      const sqlStrategy1 = makeSqlDataSourceStrategy('sqlDefinition1');
      const sqlStrategy2 = makeSqlDataSourceStrategy('sqlDefinition2');
      const definition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.ddb);
      const definition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.post.ddb, AMPLIFY_TABLE_DS_STRATEGY);
      const definition3 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.author.sql, sqlStrategy1);
      const definition4 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.comment.sql, sqlStrategy2);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([definition1, definition2, definition3, definition4]);
      expect(combinedDefinition.schema).toEqual(
        [MOCK_SCHEMA.blog.ddb, MOCK_SCHEMA.post.ddb, MOCK_SCHEMA.author.sql, MOCK_SCHEMA.comment.sql].join(os.EOL),
      );
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({
        Blog: DEFAULT_TABLE_DS_STRATEGY,
        Post: AMPLIFY_TABLE_DS_STRATEGY,
        Author: sqlStrategy1,
        Comment: sqlStrategy2,
      });
    });

    it('fails if a ModelDataSourceStrategy name is reused, even if the objects are the same shape', () => {
      const sqlStrategy1 = makeSqlDataSourceStrategy('sqlDefinition1');
      const sqlStrategy2 = makeSqlDataSourceStrategy('sqlDefinition1');
      const definition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.sql, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.post.sql, sqlStrategy2);
      expect(() => AmplifyGraphqlDefinition.combine([definition1, definition2])).toThrow();
    });

    it('supports nested combined definitions', () => {
      const sqlStrategy1 = makeSqlDataSourceStrategy('sqlDefinition1');
      const sqlStrategy2 = makeSqlDataSourceStrategy('sqlDefinition2');
      const definition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.ddb);
      const definition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.post.ddb, AMPLIFY_TABLE_DS_STRATEGY);
      const definition3 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.author.sql, sqlStrategy1);
      const definition4 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.comment.sql, sqlStrategy2);
      const combinedDefinition = AmplifyGraphqlDefinition.combine([
        definition1,
        AmplifyGraphqlDefinition.combine([definition2, AmplifyGraphqlDefinition.combine([definition3, definition4])]),
      ]);
      expect(combinedDefinition.schema).toEqual(
        [MOCK_SCHEMA.blog.ddb, MOCK_SCHEMA.post.ddb, MOCK_SCHEMA.author.sql, MOCK_SCHEMA.comment.sql].join(os.EOL),
      );
      expect(combinedDefinition.functionSlots.length).toEqual(0);
      expect(combinedDefinition.dataSourceStrategies).toEqual({
        Blog: DEFAULT_TABLE_DS_STRATEGY,
        Post: AMPLIFY_TABLE_DS_STRATEGY,
        Author: sqlStrategy1,
        Comment: sqlStrategy2,
      });
    });

    describe('Custom SQL support', () => {
      it('supports a schema with both models and custom SQL inline queries', () => {
        throw new Error('Not yet implemented');
      });

      it('supports a schema with both models and custom SQL referenced queries', () => {
        throw new Error('Not yet implemented');
      });

      it('supports a schema with both models and custom SQL with a mix of inline and referenced queries', () => {
        throw new Error('Not yet implemented');
      });

      it('supports a schema with only custom SQL inline queries', () => {
        throw new Error('Not yet implemented');
      });

      it('supports a schema with only custom SQL referenced queries', () => {
        throw new Error('Not yet implemented');
      });

      it('supports a schema with only custom SQL with a mix of inline and referenced queries', () => {
        throw new Error('Not yet implemented');
      });
    });
  });

  describe('synthesis behavior', () => {
    const makeApiByCombining = (...definitions: IAmplifyGraphqlDefinition[]): AmplifyGraphqlApi => {
      const combinedDefinition = AmplifyGraphqlDefinition.combine(definitions);
      const stack = new cdk.Stack();
      const api = new AmplifyGraphqlApi(stack, 'TestSqlBoundApi', {
        definition: combinedDefinition,
        authorizationModes: {
          apiKeyConfig: { expires: cdk.Duration.days(7) },
        },
      });
      return api;
    };

    it('combines homogenous DDB default definitions into an API with one datasource', () => {
      const definition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.ddb);
      const definition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.post.ddb, DEFAULT_TABLE_DS_STRATEGY);
      const api = makeApiByCombining(definition1, definition2);

      const {
        resources: {
          cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
          functions,
        },
      } = api;

      expect(cfnGraphqlApi).toBeDefined();
      expect(cfnGraphqlSchema).toBeDefined();
      expect(cfnApiKey).toBeDefined();
      expect(cfnDataSources).toBeDefined();

      const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'DYNAMODB');
      expect(ddbDataSources.length).toEqual(1);

      const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
      expect(lambdaDataSources.length).toEqual(0);

      expect(functions).toBeUndefined();
    });

    it('combines homogenous DDB Amplify-managed table definitions into an API with one datasource', () => {
      const definition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.ddb);
      const definition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.post.ddb, AMPLIFY_TABLE_DS_STRATEGY);
      const api = makeApiByCombining(definition1, definition2);

      const {
        resources: {
          cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
          functions,
        },
      } = api;

      expect(cfnGraphqlApi).toBeDefined();
      expect(cfnGraphqlSchema).toBeDefined();
      expect(cfnApiKey).toBeDefined();
      expect(cfnDataSources).toBeDefined();

      const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'DYNAMODB');
      expect(ddbDataSources.length).toEqual(1);

      const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
      expect(lambdaDataSources.length).toEqual(0);

      expect(functions).toBeUndefined();
    });

    it('combines different SQL table definitions into an API with one datasource', () => {
      const sqlstrategy1 = makeSqlDataSourceStrategy('sqlstrategy1');
      const sqlstrategy2 = makeSqlDataSourceStrategy('sqlstrategy2');
      const definition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.author.ddb, sqlstrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.comment.ddb, sqlstrategy2);
      const api = makeApiByCombining(definition1, definition2);

      const {
        resources: {
          cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
          functions,
        },
      } = api;

      expect(cfnGraphqlApi).toBeDefined();
      expect(cfnGraphqlSchema).toBeDefined();
      expect(cfnApiKey).toBeDefined();
      expect(cfnDataSources).toBeDefined();

      const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'DYNAMODB');
      expect(ddbDataSources.length).toEqual(0);

      const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
      expect(lambdaDataSources.length).toEqual(2);

      expect(functions).toBeDefined();
      const sqlLambda1 = functions['SQLLambdasqlstrategy1'];
      expect(sqlLambda1).toBeDefined();
      const sqlLambda2 = functions['SQLLambdasqlstrategy2'];
      expect(sqlLambda2).toBeDefined();
    });

    it('combines heterogeneous definitions for multiple supported db types into an API with multiple datasource', () => {
      const ddbdefinition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.ddb);
      const ddbdefinition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.post.ddb, AMPLIFY_TABLE_DS_STRATEGY);
      const sqlstrategy1 = makeSqlDataSourceStrategy('sqlstrategy1');
      const sqlstrategy2 = makeSqlDataSourceStrategy('sqlstrategy2');
      const sqldefinition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.author.ddb, sqlstrategy1);
      const sqldefinition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.comment.ddb, sqlstrategy2);
      const api = makeApiByCombining(ddbdefinition1, ddbdefinition2, sqldefinition1, sqldefinition2);

      const {
        resources: {
          cfnResources: { cfnGraphqlApi, cfnGraphqlSchema, cfnApiKey, cfnDataSources },
          functions,
        },
      } = api;

      expect(cfnGraphqlApi).toBeDefined();
      expect(cfnGraphqlSchema).toBeDefined();
      expect(cfnApiKey).toBeDefined();
      expect(cfnDataSources).toBeDefined();

      const ddbDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'DYNAMODB');
      expect(ddbDataSources.length).toEqual(1);

      const lambdaDataSources = Object.values(cfnDataSources).filter((dataSource) => dataSource.type === 'AWS_LAMBDA');
      expect(lambdaDataSources.length).toEqual(2);

      expect(functions).toBeDefined();
      const sqlLambda1 = functions['SQLLambdasqlstrategy1'];
      expect(sqlLambda1).toBeDefined();
      const sqlLambda2 = functions['SQLLambdasqlstrategy2'];
      expect(sqlLambda2).toBeDefined();
    });

    // We could technically check for some of these in the combine method itself, but it would be a fairly naive check matching the declared
    // model name. Instead, we'll catch this during synthesis, so that the `refersTo` transformer can validate mapped model names.
    it('fails if a model is shared across DynamoDB definitions', () => {
      const definition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.ddb);
      const definition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.ddb, AMPLIFY_TABLE_DS_STRATEGY);
      expect(() => AmplifyGraphqlDefinition.combine([definition1, definition2])).toThrow();
    });

    it('fails if a model is shared across SQL definitions', () => {
      const sqlStrategy1 = makeSqlDataSourceStrategy('sqlDefinition1');
      const sqlStrategy2 = makeSqlDataSourceStrategy('sqlDefinition2');
      const definition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.sql, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.sql, sqlStrategy2);
      expect(() => AmplifyGraphqlDefinition.combine([definition1, definition2])).toThrow();
    });

    it('fails if a model is shared across DynamoDB/SQL definitions', () => {
      const ddbdefinition = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.ddb);
      const sqlStrategy1 = makeSqlDataSourceStrategy('sqlDefinition1');
      const sqldefinition = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.blog.sql, sqlStrategy1);
      expect(() => AmplifyGraphqlDefinition.combine([ddbdefinition, sqldefinition])).toThrow();
    });

    it('fails if a many-to-many relationship is declared across a DDB/SQL boundary', () => {
      const ddbdefinition = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.manyToMany.post.ddb);
      const sqlStrategy1 = makeSqlDataSourceStrategy('sqlDefinition1');
      const sqldefinition = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.manyToMany.tag.sql, sqlStrategy1);
      expect(() => AmplifyGraphqlDefinition.combine([ddbdefinition, sqldefinition])).toThrow();
    });

    it('fails if a many-to-many relationship is declared across a SQL boundary', () => {
      const sqlStrategy1 = makeSqlDataSourceStrategy('sqlDefinition1');
      const sqlStrategy2 = makeSqlDataSourceStrategy('sqlDefinition2');
      const definition1 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.manyToMany.post.sql, sqlStrategy1);
      const definition2 = AmplifyGraphqlDefinition.fromString(MOCK_SCHEMA.manyToMany.tag.sql, sqlStrategy2);
      expect(() => AmplifyGraphqlDefinition.combine([definition1, definition2])).toThrow();
    });

    describe('Custom SQL support', () => {
      it('supports a schema with both models and custom SQL inline queries', () => {
        throw new Error('Not yet implemented');
      });

      it('supports a schema with both models and custom SQL referenced queries', () => {
        throw new Error('Not yet implemented');
      });

      it('supports a schema with both models and custom SQL with a mix of inline and referenced queries', () => {
        throw new Error('Not yet implemented');
      });

      it('supports a schema with only custom SQL inline queries', () => {
        throw new Error('Not yet implemented');
      });

      it('supports a schema with only custom SQL referenced queries', () => {
        throw new Error('Not yet implemented');
      });

      it('supports a schema with only custom SQL with a mix of inline and referenced queries', () => {
        throw new Error('Not yet implemented');
      });
    });
  });
});
