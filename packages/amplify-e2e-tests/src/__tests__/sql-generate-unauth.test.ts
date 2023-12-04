import path from 'path';
import { createNewProjectDir, deleteProjectDir, generateUnauthSQL } from 'amplify-category-api-e2e-core';
import { existsSync, writeFileSync, readFileSync } from 'fs-extra';
import { ObjectTypeDefinitionNode, parse } from 'graphql';

describe('Unauth SQL generate schema', () => {
  let projRoot;

  beforeEach(async () => {
    projRoot = await createNewProjectDir('sqlimportunauth');
  });

  afterEach(async () => {
    deleteProjectDir(projRoot);
  });

  const testUnauthGenerate = async (engineType: string, sqlSchema: string): Promise<void> => {
    const graphqlSchemaFile = 'schema.sql.graphql';
    const graphqlSchemaPath = path.join(projRoot, graphqlSchemaFile);

    writeFileSync(path.join(projRoot, 'schema.csv'), sqlSchema);
    await generateUnauthSQL(projRoot, {
      sqlSchema: 'schema.csv',
      engineType,
      out: graphqlSchemaFile,
    });

    expect(existsSync(graphqlSchemaPath)).toBeTruthy();

    const schemaContent = readFileSync(graphqlSchemaPath, 'utf8');
    const schema = parse(schemaContent);

    // Generated schema should contain the types with model directive
    const todoObjectType = schema.definitions.find(
      (d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Todo',
    ) as ObjectTypeDefinitionNode;
    expect(todoObjectType).toBeDefined();
    expect(todoObjectType.directives.find((d) => d.name.value === 'model')).toBeDefined();
  };

  it('generate workflow of mysql relational db without connecting to db', async () => {
    const schema = `TABLE_CATALOG,TABLE_SCHEMA,TABLE_NAME,COLUMN_NAME,ORDINAL_POSITION,COLUMN_DEFAULT,IS_NULLABLE,DATA_TYPE,CHARACTER_MAXIMUM_LENGTH,CHARACTER_OCTET_LENGTH,NUMERIC_PRECISION,NUMERIC_SCALE,DATETIME_PRECISION,CHARACTER_SET_NAME,COLLATION_NAME,COLUMN_TYPE,COLUMN_KEY,EXTRA,PRIVILEGES,COLUMN_COMMENT,GENERATION_EXPRESSION,SRS_ID,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,NULLABLE
def,todo_database,Todo,due_date,4,NULL,YES,date,NULL,NULL,NULL,NULL,NULL,NULL,NULL,date,,,"select,insert,update,references",,,NULL,NULL,NULL,NULL,NULL
def,todo_database,Todo,id,1,NULL,NO,int,NULL,NULL,10,0,NULL,NULL,NULL,int,PRI,,"select,insert,update,references",,,NULL,PRIMARY,0,1,
def,todo_database,Todo,start_date,3,NULL,YES,date,NULL,NULL,NULL,NULL,NULL,NULL,NULL,date,,,"select,insert,update,references",,,NULL,NULL,NULL,NULL,NULL
def,todo_database,Todo,title,2,NULL,NO,varchar,255,1020,NULL,NULL,NULL,utf8mb4,utf8mb4_0900_ai_ci,varchar(255),,,"select,insert,update,references",,,NULL,NULL,NULL,NULL,NULL`;
    await testUnauthGenerate('mysql', schema);
  });

  it('generate workflow of postgres relational db without connecting to db', async () => {
    const schema = `"enum_name","enum_values","table_name","column_name","column_default","ordinal_position","data_type","udt_name","is_nullable","character_maximum_length","indexname","constraint_type","index_columns"
NULL,NULL,"todo","id",NULL,1,"integer","int4","NO",NULL,"todo_pkey","PRIMARY KEY","id"
NULL,NULL,"todo","title",NULL,2,"character varying","varchar","NO",255,NULL,NULL,NULL
NULL,NULL,"todo","due_date",NULL,4,"date","date","YES",NULL,NULL,NULL,NULL
NULL,NULL,"todo","start_date",NULL,3,"date","date","YES",NULL,NULL,NULL,NULL`;
    await testUnauthGenerate('postgres', schema);
  });

  it('error when schema is invalid mysql', async () => {
    const sqlSchema = 'foo,bar\nbaz,bat';
    const graphqlSchemaFile = 'schema.sql.graphql';
    const graphqlSchemaPath = path.join(projRoot, graphqlSchemaFile);

    writeFileSync(path.join(projRoot, 'schema.csv'), sqlSchema);
    await generateUnauthSQL(projRoot, {
      sqlSchema: 'schema.csv',
      engineType: 'mysql',
      out: graphqlSchemaFile,
      expectMessage: 'Imported SQL schema is invalid. Imported schema is missing columns: TABLE_NAME,',
    });

    expect(existsSync(graphqlSchemaPath)).toBeFalsy();
  });

  it('error when schema is invalid postgres', async () => {
    const sqlSchema = 'foo,bar\nbaz,bat';
    const graphqlSchemaFile = 'schema.sql.graphql';
    const graphqlSchemaPath = path.join(projRoot, graphqlSchemaFile);

    writeFileSync(path.join(projRoot, 'schema.csv'), sqlSchema);
    await generateUnauthSQL(projRoot, {
      sqlSchema: 'schema.csv',
      engineType: 'postgres',
      out: graphqlSchemaFile,
      expectMessage: 'Imported SQL schema is invalid. Imported schema is missing columns: enum_name',
    });

    expect(existsSync(graphqlSchemaPath)).toBeFalsy();
  });
});
