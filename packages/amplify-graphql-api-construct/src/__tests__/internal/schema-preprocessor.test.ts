import * as path from 'path';
import * as os from 'os';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as fs from 'fs-extra';
import { AmplifyApiSchemaPreprocessor } from '../../types';
import { preprocessSchema } from '../../internal/schema-preprocessors';

const SCHEMA = 'this is a schema, i promise';
const TEST_PATH = path.join(os.tmpdir(), 'preprocessGraphqlSchemaTests');

describe('preprocessSchema', () => {
  // N.B. It is important for these tests that the file names are unique.
  describe('graphql schemas', () => {
    // Setup and teardown temp directory per test run.
    let testSchemaDir: string;
    beforeAll(() => (testSchemaDir = fs.mkdtempSync(TEST_PATH)));
    afterAll(() => fs.rmdirSync(testSchemaDir, { recursive: true }));

    it('works on a string', () => {
      expect(preprocessSchema(SCHEMA).processedSchema).toEqual(SCHEMA);
    });

    it('works with a single schemafile', () => {
      const testFilePath = path.join(testSchemaDir, 'single-file-schema.graphql');
      fs.writeFileSync(testFilePath, SCHEMA);
      const schemaFile = new appsync.SchemaFile({ filePath: testFilePath });
      expect(preprocessSchema(schemaFile).processedSchema).toEqual(SCHEMA);
    });

    it('works with a single schemafile in an array', () => {
      const testFilePath = path.join(testSchemaDir, 'single-file-in-array.graphql');
      fs.writeFileSync(testFilePath, SCHEMA);
      new appsync.SchemaFile({ filePath: testFilePath });
      expect(preprocessSchema([new appsync.SchemaFile({ filePath: testFilePath })]).processedSchema).toEqual(SCHEMA);
    });

    it('works with a multiple schemafiles', () => {
      const testFilePath1 = path.join(testSchemaDir, 'schema-part-1.graphql');
      const testFilePath2 = path.join(testSchemaDir, 'schema-part-2.graphql');
      fs.writeFileSync(testFilePath1, SCHEMA);
      fs.writeFileSync(testFilePath2, SCHEMA);
      expect(
        preprocessSchema([new appsync.SchemaFile({ filePath: testFilePath1 }), new appsync.SchemaFile({ filePath: testFilePath2 })])
          .processedSchema,
      ).toEqual(`${SCHEMA}${os.EOL}${SCHEMA}`);
    });
  });

  describe('custom preprocessors', () => {
    it('works with a preprocessor that accepts null', () => {
      const preprocessor: AmplifyApiSchemaPreprocessor<null> = () => ({ processedSchema: 'preprocessed schema' });
      expect(preprocessSchema(null, preprocessor).processedSchema).toEqual('preprocessed schema');
    });

    it('works with a preprocessor that accepts value which is used', () => {
      const preprocessor: AmplifyApiSchemaPreprocessor<number> = (schema: number) => {
        switch (schema) {
          case 0:
            return { processedSchema: 'schema is little' };
          case 5:
            return { processedSchema: 'schema is medium' };
          case 100:
            return { processedSchema: 'schema is big' };
          default:
            throw new Error('schema is not supported');
        }
      };
      expect(preprocessSchema(0, preprocessor).processedSchema).toEqual('schema is little');
      expect(preprocessSchema(5, preprocessor).processedSchema).toEqual('schema is medium');
      expect(preprocessSchema(100, preprocessor).processedSchema).toEqual('schema is big');
    });
  });
});
