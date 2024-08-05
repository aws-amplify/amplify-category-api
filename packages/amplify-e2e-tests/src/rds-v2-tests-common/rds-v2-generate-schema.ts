import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import {
  addApiWithoutSchema,
  apiGenerateSchema,
  createNewProjectDir,
  deleteDBInstance,
  deleteProject,
  deleteProjectDir,
  getProjectMeta,
  importRDSDatabase,
  initJSProjectWithProfile,
  setupRDSInstanceAndData,
} from 'amplify-category-api-e2e-core';
import { existsSync, readFileSync, writeFileSync } from 'fs-extra';
import generator from 'generate-password';
import { ObjectTypeDefinitionNode, parse, StringValueNode } from 'graphql';
import path from 'path';

export const testRDSGenerateSchema = (engine: ImportedRDSType, queries: string[]) => {
  describe('RDS Generate Schema tests', () => {
    const [db_user, db_password, db_identifier] = generator.generateMultiple(3);

    // Generate settings for RDS instance
    const username = db_user;
    const password = db_password;
    let region = 'us-east-1';
    let port = engine === ImportedRDSType.MYSQL ? 3306 : 5432;
    const database = 'default_db';
    let host = 'localhost';
    const identifier = `integtest${db_identifier}`;
    const engineSuffix = engine === ImportedRDSType.MYSQL ? 'mysql' : 'pg';
    const engineName = engine === ImportedRDSType.MYSQL ? 'mysql' : 'postgres';
    const projName = `${engineSuffix}generate`;
    const apiName = projName;

    let projRoot;

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projName);
      await initJSProjectWithProfile(projRoot, {
        disableAmplifyAppCreation: false,
      });

      const metaAfterInit = getProjectMeta(projRoot);
      region = metaAfterInit.providers.awscloudformation.Region;
      await setupDatabase();

      await addApiWithoutSchema(projRoot, { transformerVersion: 2, apiName });

      await importRDSDatabase(projRoot, {
        engine,
        database,
        host,
        port,
        username,
        password,
        useVpc: true,
        apiExists: true,
      });
    });

    afterAll(async () => {
      await cleanupDatabase();

      const metaFilePath = path.join(projRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
      if (existsSync(metaFilePath)) {
        await deleteProject(projRoot);
      }
      deleteProjectDir(projRoot);
    });

    const setupDatabase = async () => {
      const dbConfig = {
        identifier,
        engine: engine === ImportedRDSType.MYSQL ? ('mysql' as const) : ('postgres' as const),
        dbname: database,
        username,
        password,
        region,
      };

      const db = await setupRDSInstanceAndData(dbConfig, queries);
      port = db.port;
      host = db.endpoint;
    };

    const cleanupDatabase = async () => {
      await deleteDBInstance(identifier, region);
    };

    it('preserves the schema edits for JSON field', async () => {
      const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.sql.graphql');
      const schemaContent = readFileSync(rdsSchemaFilePath, 'utf8');
      const schema = parse(schemaContent);

      // Generated schema should contains the types and fields from the database
      const contactObjectType = schema.definitions.find(
        (d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Contact',
      ) as ObjectTypeDefinitionNode;
      const personObjectType = schema.definitions.find(
        (d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Person',
      ) as ObjectTypeDefinitionNode;
      expect(contactObjectType).toBeDefined();
      expect(personObjectType).toBeDefined();

      // Verify the fields in the generated schema on type 'Contact'
      const contactIdFieldType = contactObjectType.fields.find((f) => f.name.value === 'id');
      const contactFirstNameFieldType = contactObjectType.fields.find((f) => f.name.value === 'firstName');
      const contactLastNameFieldType = contactObjectType.fields.find((f) => f.name.value === 'lastName');
      expect(contactIdFieldType).toBeDefined();
      expect(contactFirstNameFieldType).toBeDefined();
      expect(contactLastNameFieldType).toBeDefined();
      // PrimaryKey directive must be defined on id field.
      expect(contactIdFieldType.directives.find((d) => d.name.value === 'primaryKey')).toBeDefined();

      // Verify the fields in the generated schema on type 'Person' before making edits
      const personsIdFieldType = personObjectType.fields.find((f) => f.name.value === 'id');
      const personsInfoFieldType = personObjectType.fields.find((f) => f.name.value === 'info') as any;
      expect(personsIdFieldType).toBeDefined();
      expect(personsInfoFieldType).toBeDefined();
      expect(personsInfoFieldType.type?.type?.name?.value).toEqual('AWSJSON');

      // Make edits to the generated schema
      const editedSchema = `
              input AMPLIFY {
                  engine: String = "${engineName}"
                  globalAuthRule: AuthRule = {allow: public}
              }
      
              type Contact @model {
                  id: Int! @primaryKey
                  firstName: String
                  lastName: String
              }
      
              type Person @model {
                  id: Int! @primaryKey
                  info: [String]!
              }
      
              type Task @model {
                id: Int! @refersTo(name: "Id") @primaryKey
                description: String @refersTo(name: "Description")
                taskName: String @refersTo(name: "task_name")
              }
      
              type TblTodo @refersTo(name: "tbl_todos") @model {
                  id: Int! @primaryKey
                  description: String
              }
            `;
      writeFileSync(rdsSchemaFilePath, editedSchema);
      await apiGenerateSchema(projRoot, {
        database,
        host,
        port,
        username,
        password,
        validCredentials: true,
        useVpc: true,
      });

      // The re-generated schema preserves the edits that were made
      const regeneratedSchema = readFileSync(rdsSchemaFilePath, 'utf8');
      expect(regeneratedSchema.replace(/\s/g, '')).toEqual(editedSchema.replace(/\s/g, ''));
    });

    it('infers and preserves the model name mapping edits', async () => {
      const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.sql.graphql');
      const schemaContent = readFileSync(rdsSchemaFilePath, 'utf8');
      const schema = parse(schemaContent);

      // Generated schema should infer the model type name mapping
      const originalTodosObjectType = schema.definitions.find((d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'tbl_todos');
      expect(originalTodosObjectType).toBeUndefined();

      const mappedTodoObjectType = schema.definitions.find(
        (d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'TblTodo',
      ) as ObjectTypeDefinitionNode;
      expect(mappedTodoObjectType).toBeDefined();

      const inferredRefersTo = mappedTodoObjectType?.directives?.find(
        (d) =>
          d?.name?.value === 'refersTo' &&
          d?.arguments?.find((arg) => arg?.name?.value === 'name' && (arg?.value as StringValueNode)?.value === 'tbl_todos'),
      );
      expect(inferredRefersTo).toBeDefined();

      // Verify the fields in the generated schema on mapped model are as expected
      const todoIdFieldType = mappedTodoObjectType.fields.find((f) => f.name.value === 'id');
      const todoDescriptionFieldType = mappedTodoObjectType.fields.find((f) => f.name.value === 'description');
      expect(todoIdFieldType).toBeDefined();
      expect(todoDescriptionFieldType).toBeDefined();
      // PrimaryKey directive must be defined on Id field.
      expect(todoIdFieldType.directives.find((d) => d.name.value === 'primaryKey')).toBeDefined();

      // Make edits to the generated schema to update the inferred model type name
      const editedSchema = `
              input AMPLIFY {
                  engine: String = "${engineName}"
                  globalAuthRule: AuthRule = {allow: public}
              }
      
              type Contact @model {
                  id: Int! @primaryKey
                  firstName: String
                  lastName: String
              }
      
              type Person @model {
                  id: Int! @primaryKey
                  info: [String]!
              }
      
              type Task @model {
                id: Int! @refersTo(name: "Id") @primaryKey
                description: String @refersTo(name: "Description")
                taskName: String @refersTo(name: "task_name")
              }
      
              type Todo @refersTo(name: "tbl_todos") @model {
                  id: Int! @primaryKey
                  description: String
              }
            `;
      writeFileSync(rdsSchemaFilePath, editedSchema);
      await apiGenerateSchema(projRoot, {
        database,
        host,
        port,
        username,
        password,
        validCredentials: true,
        useVpc: true,
      });

      // The re-generated schema preserves the edits that were made
      const regeneratedSchema = readFileSync(rdsSchemaFilePath, 'utf8');
      expect(regeneratedSchema.replace(/\s/g, '')).toEqual(editedSchema.replace(/\s/g, ''));
    });

    it('infers and preserves the field name mapping edits', async () => {
      const rdsSchemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.sql.graphql');
      const schemaContent = readFileSync(rdsSchemaFilePath, 'utf8');
      const schema = parse(schemaContent);

      // Generated schema should have the model containing field mappings
      const taskModel = schema.definitions.find(
        (d) => d.kind === 'ObjectTypeDefinition' && d.name.value === 'Task',
      ) as ObjectTypeDefinitionNode;
      expect(taskModel).toBeDefined();

      // No model level refers to exists
      const modelLevelRefersTo = taskModel?.directives?.find(
        (d) =>
          d?.name?.value === 'refersTo' &&
          d?.arguments?.find((arg) => arg?.name?.value === 'name' && (arg?.value as StringValueNode)?.value === 'Task'),
      );
      expect(modelLevelRefersTo).toBeUndefined();

      // Inferred field names are as expected
      const idField = taskModel.fields.find((f) => f.name.value === 'id');
      const descriptionField = taskModel.fields.find((f) => f.name.value === 'description');
      const taskNameField = taskModel.fields.find((f) => f.name.value === 'taskName');
      expect(idField).toBeDefined();
      expect(descriptionField).toBeDefined();
      expect(taskNameField).toBeDefined();

      // Check expected directives on id field
      expect(idField?.directives?.find((d) => d.name.value === 'primaryKey')).toBeDefined();
      expect(
        idField?.directives?.find(
          (d) =>
            d?.name?.value === 'refersTo' &&
            d?.arguments?.find((arg) => arg?.name?.value === 'name' && (arg?.value as StringValueNode)?.value === 'Id'),
        ),
      ).toBeDefined();

      // Verify name mapping for description field
      expect(
        descriptionField?.directives?.find(
          (d) =>
            d?.name?.value === 'refersTo' &&
            d?.arguments?.find((arg) => arg?.name?.value === 'name' && (arg?.value as StringValueNode)?.value === 'Description'),
        ),
      ).toBeDefined();

      // Verify name mapping for task_name field
      expect(
        taskNameField?.directives?.find(
          (d) =>
            d?.name?.value === 'refersTo' &&
            d?.arguments?.find((arg) => arg?.name?.value === 'name' && (arg?.value as StringValueNode)?.value === 'task_name'),
        ),
      ).toBeDefined();

      // Make edits to the generated schema to update the inferred field name mappings
      const editedSchema = `
              input AMPLIFY {
                  engine: String = "${engineName}"
                  globalAuthRule: AuthRule = {allow: public}
              }
      
              type Contact @model {
                  id: Int! @primaryKey
                  firstName: String
                  lastName: String
              }
      
              type Person @model {
                  id: Int! @primaryKey
                  info: [String]!
              }
      
              type Task @model {
                ID: Int! @refersTo(name: "Id") @primaryKey
                Description: String
                taskName: String @refersTo(name: "task_name")
              }
      
              type Todo @refersTo(name: "tbl_todos") @model {
                id: Int! @primaryKey
                description: String
              }
          `;
      writeFileSync(rdsSchemaFilePath, editedSchema);
      await apiGenerateSchema(projRoot, {
        database,
        host,
        port,
        username,
        password,
        validCredentials: true,
      });

      // The re-generated schema preserves the edits that were made
      const regeneratedSchema = readFileSync(rdsSchemaFilePath, 'utf8');
      expect(regeneratedSchema.replace(/\s/g, '')).toEqual(editedSchema.replace(/\s/g, ''));
    });
  });
};
