import { preprocessGraphQLSchema } from '../../internal/schema-preprocessors';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

const SCHEMA = 'this is a schema, i promise';
const TEST_PATH = path.join(os.tmpdir(), 'preprocessGraphQLSchemaTests');

// N.B. It is important for these tests that the file names are unique.
describe('preprocessGraphQLSchema', () => {
  
  // Setup and teardown temp directory per test run.
  let testSchemaDir: string;
  beforeAll(() => testSchemaDir = fs.mkdtempSync(TEST_PATH));
  afterAll(() => fs.rmdirSync(testSchemaDir, { recursive: true }));

  it('works on a string', () => {
    expect(preprocessGraphQLSchema(SCHEMA)).toEqual(SCHEMA);
  });

  it('works with a single schemafile', () => {
    const testFilePath = path.join(testSchemaDir, 'single-file-schema.graphql')
    fs.writeFileSync(testFilePath, SCHEMA);
    const schemaFile = new appsync.SchemaFile({ filePath: testFilePath });
    expect(preprocessGraphQLSchema(schemaFile)).toEqual(SCHEMA);
  });

  it('works with a single schemafile in an array', () => {
    const testFilePath = path.join(testSchemaDir, 'single-file-in-array.graphql')
    fs.writeFileSync(testFilePath, SCHEMA);
    const schemaFile = new appsync.SchemaFile({ filePath: testFilePath });
    expect(preprocessGraphQLSchema([
      new appsync.SchemaFile({ filePath: testFilePath }),
    ])).toEqual(SCHEMA);
  });

  it('works with a multiple schemafiles', () => {
    const testFilePath1 = path.join(testSchemaDir, 'schema-part-1.graphql')
    const testFilePath2 = path.join(testSchemaDir, 'schema-part-2.graphql')
    fs.writeFileSync(testFilePath1, SCHEMA);
    fs.writeFileSync(testFilePath2, SCHEMA);
    expect(preprocessGraphQLSchema([
      new appsync.SchemaFile({ filePath: testFilePath1 }),
      new appsync.SchemaFile({ filePath: testFilePath2 }),
    ])).toEqual(`${SCHEMA}
${SCHEMA}`);
  });
});
