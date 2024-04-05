import * as path from 'path';
import * as fs from 'fs';
import { createNewProjectDir, deleteProjectDir, npmInstall, npmTest } from 'amplify-category-api-e2e-core';
import { DBEngineType, Engine, Field, Model, Schema } from '@aws-amplify/graphql-schema-generator';
import { generateTypescriptDataSchema } from '@aws-amplify/data-schema-generator';

describe('validate generated typescript data schema', () => {
  let projectDir: string;
  const EXAMPLE_PROJECT_PATH = path.join(__dirname, '..', 'examples', 'ts-data-schema-validation');
  beforeEach(async () => {
    projectDir = await createNewProjectDir('ts-data-schema');
  });

  const setupProject = async (engine: DBEngineType): Promise<void> => {
    fs.copyFileSync(path.join(EXAMPLE_PROJECT_PATH, 'package.json'), path.join(projectDir, 'package.json'));
    fs.copyFileSync(path.join(EXAMPLE_PROJECT_PATH, 'tsconfig.json'), path.join(projectDir, 'tsconfig.json'));
    fs.mkdirSync(path.join(projectDir, 'src'));
    fs.writeFileSync(path.join(projectDir, 'src', 'schema.ts'), generateSchema(engine));
  };

  const generateSchema = (engine: DBEngineType): string => {
    const dbschema = new Schema(new Engine(engine));
    const model = new Model('Table');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('field1', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('field2', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('field3', { kind: 'Scalar', name: 'Int' }));
    model.addField(new Field('field4', { kind: 'Scalar', name: 'Float' }));
    model.addField(new Field('field5', { kind: 'Scalar', name: 'Boolean' }));
    model.addField(new Field('field6', { kind: 'Scalar', name: 'ID' }));
    model.addField(new Field('field7', { kind: 'Scalar', name: 'AWSDate' }));
    model.addField(new Field('field8', { kind: 'Scalar', name: 'AWSTime' }));
    model.addField(new Field('field9', { kind: 'Scalar', name: 'AWSDateTime' }));
    model.addField(new Field('field10', { kind: 'Scalar', name: 'AWSTimestamp' }));
    model.addField(new Field('field11', { kind: 'Scalar', name: 'AWSJSON' }));
    model.addField(new Field('field12', { kind: 'Scalar', name: 'AWSEmail' }));
    model.addField(new Field('field13', { kind: 'Scalar', name: 'AWSPhone' }));
    model.addField(new Field('field14', { kind: 'Scalar', name: 'AWSURL' }));
    model.addField(new Field('field15', { kind: 'Scalar', name: 'AWSIPAddress' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateTypescriptDataSchema(dbschema);
    return graphqlSchema;
  };

  afterEach(async () => {
    deleteProjectDir(projectDir);
  });

  test('generated schema should compile successfully for MySQL engine', async () => {
    await setupProject('MySQL');
    npmInstall(projectDir);
    npmTest(projectDir);
  });

  test('generated schema should compile successfully for Postgres engine', async () => {
    await setupProject('Postgres');
    npmInstall(projectDir);
    npmTest(projectDir);
  });
});
