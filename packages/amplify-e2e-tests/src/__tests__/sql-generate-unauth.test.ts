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
    const schema = `"table_catalog","table_schema","table_name","column_name","ordinal_position","column_default","is_nullable","data_type","character_maximum_length","character_octet_length","numeric_precision","numeric_precision_radix","numeric_scale","datetime_precision","interval_type","interval_precision","character_set_catalog","character_set_schema","character_set_name","collation_catalog","collation_schema","collation_name","domain_catalog","domain_schema","domain_name","udt_catalog","udt_schema","udt_name","scope_catalog","scope_schema","scope_name","maximum_cardinality","dtd_identifier","is_self_referencing","is_identity","identity_generation","identity_start","identity_increment","identity_maximum","identity_minimum","identity_cycle","is_generated","generation_expression","is_updatable","schemaname","tablename","indexname","tablespace","indexdef","enum_name","enum_values","index_columns"
"tododb","public","todo","id",1,NULL,"NO","integer",NULL,NULL,32,2,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,"tododb","pg_catalog","int4",NULL,NULL,NULL,NULL,"1","NO","NO",NULL,NULL,NULL,NULL,NULL,"NO","NEVER",NULL,"YES","public","todo","todo_pkey",NULL,"CREATE UNIQUE INDEX todo_pkey ON public.todo USING btree (id)",NULL,NULL,"id"
"tododb","public","todo","title",2,NULL,"NO","character varying",255,1020,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,"tododb","pg_catalog","varchar",NULL,NULL,NULL,NULL,"2","NO","NO",NULL,NULL,NULL,NULL,NULL,"NO","NEVER",NULL,"YES",NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL
"tododb","public","todo","due_date",4,NULL,"YES","date",NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,"tododb","pg_catalog","date",NULL,NULL,NULL,NULL,"4","NO","NO",NULL,NULL,NULL,NULL,NULL,"NO","NEVER",NULL,"YES",NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL
"tododb","public","todo","start_date",3,NULL,"YES","date",NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,"tododb","pg_catalog","date",NULL,NULL,NULL,NULL,"3","NO","NO",NULL,NULL,NULL,NULL,NULL,"NO","NEVER",NULL,"YES",NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL`;
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
