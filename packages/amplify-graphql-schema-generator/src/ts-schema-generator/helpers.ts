import ts from 'typescript';
import { TYPESCRIPT_DATA_SCHEMA_CONSTANTS, toPascalCase } from 'graphql-transformer-common';
import { VpcConfig } from '@aws-amplify/graphql-transformer-interfaces';
import { DBEngineType, EnumType, Field, FieldType, Model, Schema } from '../schema-representation';
import { CommentNode } from '../../../graphql-mapping-template/lib/ast';

const GQL_TYPESCRIPT_DATA_SCHEMA_TYPE_MAP = {
  string: 'string',
  int: 'integer',
  float: 'float',
  boolean: 'boolean',
  id: 'id',
  awsdate: 'date',
  awstime: 'time',
  awsdatetime: 'datetime',
  awstimestamp: 'timestamp',
  awsjson: 'json',
  awsemail: 'email',
  awsphone: 'phone',
  awsurl: 'url',
  awsipaddress: 'ipAddress',
};

/**
 * Creates a typescript data schema property from internal SQL schema representation
 * Example typescript data schema property output: `id: a.string().required()`
 * @param field SQL IR field
 * @returns Typescript data schema property in TS Node format
 */
const createProperty = (field: Field, engine: string, modelName: string): ts.Node => {
  const typeExpression = createDataType(field.type, engine, modelName, field.name);
  return ts.factory.createPropertyAssignment(ts.factory.createIdentifier(field.name), typeExpression as ts.Expression);
};

/**
 * Creates a typescript data schema type from internal SQL schema representation
 * Example typescript data schema type output: `a.string().required()`
 * @param type SQL IR field type
 * @returns Typescript data schema type in TS Node format
 */
const createDataType = (type: FieldType, engine: string, modelName: string, fieldName: string): ts.Node => {
  if (type.kind === 'Scalar') {
    return ts.factory.createCallExpression(
      ts.factory.createIdentifier(`${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REFERENCE_A}.${getTypescriptDataSchemaType(type.name)}`),
      undefined,
      undefined,
    );
  }

  // make it in the form a.ref('name')
  if (type.kind === 'Enum') {
    if (engine === 'Postgres') {
      return ts.factory.createCallExpression(
        ts.factory.createIdentifier(`${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REFERENCE_A}.${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REF_METHOD}`),
        undefined,
        [ts.factory.createStringLiteral(toPascalCase([type.name]))],
      );
    } else if (engine === 'MySQL') {
      return ts.factory.createCallExpression(
        ts.factory.createIdentifier(`${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REFERENCE_A}.${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REF_METHOD}`),
        undefined,
        [ts.factory.createStringLiteral(toPascalCase([modelName, fieldName]))],
      );
    } else {
      throw new Error('Unsupported engine type');
    }
  }

  // We do not import any Database type as 'Custom' type.
  // In case if there is a custom type in the IR schema, we will import it as string.
  if (type.kind === 'Custom') {
    return ts.factory.createCallExpression(
      ts.factory.createIdentifier(`${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REFERENCE_A}.${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.STRING_METHOD}`),
      undefined,
      undefined,
    );
  }

  // List or NonNull
  const modifier = type.kind === 'List' ? TYPESCRIPT_DATA_SCHEMA_CONSTANTS.ARRAY_METHOD : TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REQUIRED_METHOD;
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      createDataType(type.type, engine, modelName, fieldName) as ts.Expression,
      ts.factory.createIdentifier(modifier),
    ),
    undefined,
    undefined,
  );
};

const getTypescriptDataSchemaType = (type: string): string => {
  const DEFAULT_DATATYPE = TYPESCRIPT_DATA_SCHEMA_CONSTANTS.STRING_METHOD;
  const tsDataSchemaType = GQL_TYPESCRIPT_DATA_SCHEMA_TYPE_MAP[type.toLowerCase()];
  return tsDataSchemaType ?? DEFAULT_DATATYPE;
};

const createModelDefinition = (model: Model, engine: string): ts.Node => {
  const properties = model.getFields().map((field) => {
    return createProperty(field, engine, model.getName());
  });
  return ts.factory.createObjectLiteralExpression(properties as ts.ObjectLiteralElementLike[], true);
};

/**
 * Creates a typescript data schema type from internal SQL schema representation
 * Example typescript data schema type output: `a.enum()`
 * @param type SQL IR Enum type
 * @returns Typescript data schema type in TS Node format
 */
const createEnums = (type: EnumType, engine: string, modelName: string, enumName: string): ts.Node => {
  if (engine === 'Postgres') {
    const typeExpression = ts.factory.createCallExpression(
      ts.factory.createIdentifier(`${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REFERENCE_A}.${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.ENUM_METHOD}`),
      undefined,
      [
        ts.factory.createArrayLiteralExpression(
          type.values.map((value) => ts.factory.createStringLiteral(value)),
          true,
        ),
      ],
    );
    return ts.factory.createPropertyAssignment(ts.factory.createIdentifier(toPascalCase([type.name])), typeExpression);
  } else if (engine === 'MySQL') {
    const typeExpression = ts.factory.createCallExpression(
      ts.factory.createIdentifier(`${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REFERENCE_A}.${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.ENUM_METHOD}`),
      undefined,
      [
        ts.factory.createArrayLiteralExpression(
          type.values.map((value) => ts.factory.createStringLiteral(value)),
          true,
        ),
      ],
    );
    return ts.factory.createPropertyAssignment(ts.factory.createIdentifier(toPascalCase([modelName, enumName])), typeExpression);
  } else {
    throw new Error('Unsupported engine type');
  }
};

const createModel = (model: Model, engine: string): ts.Node => {
  const modelExpr = ts.factory.createCallExpression(
    ts.factory.createIdentifier(`${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REFERENCE_A}.${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.MODEL_METHOD}`),
    undefined,
    [createModelDefinition(model, engine) as ts.Expression],
  );

  // Add primary key to the model
  const modelExprWithPK = ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(modelExpr, ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.IDENTIFIER_METHOD)),
    undefined,
    [
      ts.factory.createArrayLiteralExpression(
        model
          .getPrimaryKey()
          .getFields()
          .map((field) => ts.factory.createStringLiteral(field)),
        true,
      ),
    ],
  );

  return ts.factory.createPropertyAssignment(ts.factory.createStringLiteral(model.getName()), modelExprWithPK as ts.Expression);
};

const exportModifier = ts.factory.createModifier(ts.SyntaxKind.ExportKeyword);

export type DataSourceGenerateConfig = {
  secretNames: {
    connectionUri: string;
    sslCertificate?: string;
  };
  identifier: string;
  vpcConfig?: VpcConfig;
};

/**
 * Creates a typescript data schema from internal SQL schema representation
 * Example typescript data schema:
 * ```
 * export const schema = a.schema({              <--- createSchema()
 *   User: a.model({                             <--- createModel()
 *     id: a.string().required(),                <--- createProperty()
 *     name: a.string(),
 *     status: a.enum(['ACTIVE', 'INACTIVE']),
 *   }),
 * });
 * @param schema
 * @returns Typescript data schema in TS Node format
 */
export const createSchema = (schema: Schema, config?: DataSourceGenerateConfig): ts.Node => {
  const modelsWithPrimaryKeyCount = schema.getModels().filter((model) => model.getPrimaryKey()).length;
  if (modelsWithPrimaryKeyCount === 0) {
    throw new Error('No valid tables found. Make sure at least one table has a primary key.');
  }

  const engine = schema.getEngine().type;

  const nullEnumFields = schema // find null enum fields in all models
    .getModels()
    .map((model) =>
      model
        .getFields()
        .filter((field) => field.type.kind === 'Enum')
        .map((field) => {
          if (field.type.kind === 'Enum') {
            return createEnums(field.type, engine, model.getName(), field.name);
          } else {
            return undefined;
          }
        }),
    );

  const RequiredEnumFields = schema // find required enum fields in all models
    .getModels()
    .map((model) =>
      model
        .getFields()
        .filter((field) => field.type.kind === 'NonNull' && field.type.type.kind === 'Enum')
        .map((field) => {
          if (field.type.kind === 'NonNull' && field.type.type.kind === 'Enum') {
            return createEnums(field.type.type, engine, model.getName(), field.name);
          } else {
            return undefined;
          }
        }),
    );

  const models = schema
    .getModels()
    .filter((model) => model.getPrimaryKey())
    .map((model) => {
      return createModel(model, engine);
    });

  const combinedEnums = nullEnumFields.concat(RequiredEnumFields).flat(); // making 1 D array

  /** 
  for postgresql since enums are declared globally to void declaring duplicate enums we
  declare find unique enums and then pass it to the schema  
  **/
  if (engine === 'Postgres') {
    const seenEnums = new Set<string>();
    const uniqueEnums = combinedEnums.filter((node) => {
      if (seenEnums.has(node['name'].escapedText)) {
        return false;
      } else {
        seenEnums.add(node['name'].escapedText);
        return true;
      }
    });
    const modelsWithEnums = models.concat(uniqueEnums); // appending enums to models for postgresql

    const tsSchema = ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        createConfigureExpression(schema, config),
        ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.SCHEMA_METHOD),
      ),
      undefined,
      [ts.factory.createObjectLiteralExpression(modelsWithEnums as ts.ObjectLiteralElementLike[], true)],
    );
    return ts.factory.createVariableStatement(
      [exportModifier],
      ts.factory.createVariableDeclarationList(
        [
          ts.factory.createVariableDeclaration(
            ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.EXPORT_VARIABLE_NAME),
            undefined,
            undefined,
            tsSchema,
          ),
        ],
        ts.NodeFlags.Const,
      ),
    );
  }

  /** 
    For mysql we donot need to remove duplicates due to model level declaration of enums
    Hence we directly concat it and pass it to schema 
  **/
  const modelsWithEnums = models.concat(combinedEnums); // appending enums to models for MySql

  const tsSchema = ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      createConfigureExpression(schema, config),
      ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.SCHEMA_METHOD), // create a.schema()
    ),
    undefined,
    [ts.factory.createObjectLiteralExpression(modelsWithEnums as ts.ObjectLiteralElementLike[], true)],
  );
  return ts.factory.createVariableStatement(
    [exportModifier],
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.EXPORT_VARIABLE_NAME),
          undefined,
          undefined,
          tsSchema,
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );
};

/**
 * Creates an import expression for typescript data schema
 * @returns Import statement in TS Node format
 */
export const createImportExpression = (containsSecret: boolean): ts.NodeArray<ts.ImportDeclaration> => {
  const importStatement = ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamedImports([
        ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REFERENCE_A)),
      ]),
    ),
    ts.factory.createStringLiteral(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.SCHEMA_PACKAGE),
  );
  const internalsConfigureImportStatement = ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamedImports([
        ts.factory.createImportSpecifier(
          false,
          undefined,
          ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.INTERNALS_CONFIGURE_METHOD),
        ),
      ]),
    ),
    ts.factory.createStringLiteral(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.SCHEMA_PACKAGE_INTERNALS),
  );
  const secretImportStatement = ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamedImports([
        ts.factory.createImportSpecifier(
          false,
          undefined,
          ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.BACKEND_SECRET_METHOD),
        ),
      ]),
    ),
    ts.factory.createStringLiteral(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.BACKEND_PACKAGE),
  );

  const importStatementWithEslintDisabled = ts.addSyntheticLeadingComment(
    importStatement,
    ts.SyntaxKind.MultiLineCommentTrivia,
    ' eslint-disable ',
    true,
  );

  const importStatementWithAutoGeneratedComment = ts.addSyntheticLeadingComment(
    importStatementWithEslintDisabled,
    ts.SyntaxKind.MultiLineCommentTrivia,
    ' THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY. ',
    true,
  );

  const importExpressions = [importStatementWithAutoGeneratedComment];
  if (containsSecret) {
    importExpressions.push(internalsConfigureImportStatement, secretImportStatement);
  }
  return ts.factory.createNodeArray(importExpressions);
};

export const createConfigureExpression = (schema: Schema, config: DataSourceGenerateConfig): ts.Expression => {
  if (!config) {
    return ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REFERENCE_A);
  }
  const databaseConfig = [
    ts.factory.createPropertyAssignment(
      ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.PROPERTY_IDENTIFIER),
      ts.factory.createStringLiteral(config.identifier),
    ),
    ts.factory.createPropertyAssignment(
      ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.PROPERTY_ENGINE),
      ts.factory.createStringLiteral(convertDBEngineToDBProtocol(schema.getEngine().type)),
    ),
  ];

  if (config?.secretNames?.connectionUri) {
    databaseConfig.push(
      ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.PROPERTY_CONNECTION_URI),
        ts.factory.createCallExpression(ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.BACKEND_SECRET_METHOD), undefined, [
          ts.factory.createStringLiteral(config.secretNames.connectionUri),
        ]),
      ),
    );
  }

  if (config?.secretNames?.sslCertificate) {
    databaseConfig.push(
      ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.PROPERTY_SSL_CERTIFICATE),
        ts.factory.createCallExpression(ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.BACKEND_SECRET_METHOD), undefined, [
          ts.factory.createStringLiteral(config.secretNames.sslCertificate),
        ]),
      ),
    );
  }

  if (config.vpcConfig) {
    databaseConfig.push(
      ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.PROPERTY_VPC),
        createVpcConfigExpression(config.vpcConfig),
      ),
    );
  }

  const dbConfig = ts.factory.createObjectLiteralExpression(
    [
      ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.PROPERTY_DATABASE),
        ts.factory.createObjectLiteralExpression(databaseConfig, true),
      ),
    ],
    true,
  );
  const configureExpr = ts.factory.createCallExpression(
    ts.factory.createIdentifier(`${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.INTERNALS_CONFIGURE_METHOD}`),
    undefined,
    [dbConfig],
  );
  return configureExpr;
};

const convertDBEngineToDBProtocol = (engine: DBEngineType): 'mysql' | 'postgresql' | 'dynamodb' => {
  switch (engine) {
    case 'MySQL':
      return 'mysql';
    case 'Postgres':
      return 'postgresql';
    default:
      return 'dynamodb';
  }
};

const createVpcConfigExpression = (vpc: VpcConfig): ts.Expression => {
  const vpcIdExpression = ts.factory.createPropertyAssignment(
    ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.PROPERTY_VPC_ID),
    ts.factory.createStringLiteral(vpc.vpcId),
  );
  const securityGroupIdsExpression = ts.factory.createPropertyAssignment(
    ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.PROPERTY_SECURITY_GROUP_IDS),
    ts.factory.createArrayLiteralExpression(
      vpc.securityGroupIds.map((sg) => ts.factory.createStringLiteral(sg)),
      true,
    ),
  );
  const subnetAvailabilityZoneExpression = ts.factory.createPropertyAssignment(
    ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.PROPERTY_AZ_CONFIG),
    ts.factory.createArrayLiteralExpression(
      vpc.subnetAvailabilityZoneConfig.map((az) => {
        return ts.factory.createObjectLiteralExpression(
          [
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.PROPERTY_SUBNET_ID),
              ts.factory.createStringLiteral(az.subnetId),
            ),
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier(TYPESCRIPT_DATA_SCHEMA_CONSTANTS.PROPERTY_AZ),
              ts.factory.createStringLiteral(az.availabilityZone),
            ),
          ],
          true,
        );
      }),
      true,
    ),
  );

  const vpcConfig = ts.factory.createObjectLiteralExpression(
    [vpcIdExpression, securityGroupIdsExpression, subnetAvailabilityZoneExpression],
    true,
  );

  return vpcConfig;
};
