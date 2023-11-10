import * as fs from 'fs';
import * as path from 'path';

import { SQLLambdaModelDataSourceStrategyFactory } from '../sql-model-datasource-strategy';
import { SQLLambdaModelDataSourceStrategy } from '../model-datasource-strategy';
import { MOCK_SCHEMA, makeSqlDataSourceStrategy } from './mock-definitions';

describe('SQLLambdaModelDataSourceDefinitionStrategy', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync('sql-bound-definition-tests');
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir, { recursive: true });
  });

  it('constructs a definition using fromCustomSqlFiles', () => {
    const queryFilePath = path.join(tmpDir, 'myCustomQueryReference.sql');
    fs.writeFileSync(queryFilePath, MOCK_SCHEMA.customSql.statements.query);
    const mutationFilePath = path.join(tmpDir, 'myCustomMutationReference.sql');
    fs.writeFileSync(mutationFilePath, MOCK_SCHEMA.customSql.statements.mutation);

    const otherOptions: Exclude<SQLLambdaModelDataSourceStrategy, 'customSqlStatements'> = makeSqlDataSourceStrategy('mystrategy');

    const strategy = SQLLambdaModelDataSourceStrategyFactory.fromCustomSqlFiles([queryFilePath, mutationFilePath], otherOptions);

    expect(strategy.customSqlStatements?.['myCustomQueryReference']).toEqual(MOCK_SCHEMA.customSql.statements.query);
    expect(strategy.customSqlStatements?.['myCustomMutationReference']).toEqual(MOCK_SCHEMA.customSql.statements.mutation);
    expect(strategy.dbType).toEqual(otherOptions.dbType);
    expect(strategy.vpcConfiguration).toEqual(otherOptions.vpcConfiguration);
    expect(strategy.dbConnectionConfig).toEqual(otherOptions.dbConnectionConfig);
  });
});
