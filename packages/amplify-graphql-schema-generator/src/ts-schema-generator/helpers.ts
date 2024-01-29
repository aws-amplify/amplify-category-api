import ts from 'typescript';
import { TYPESCRIPT_DATA_SCHEMA_CONSTANTS } from 'graphql-transformer-common';
import { Field, FieldType, Model, Schema } from '../schema-representation';

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
const createProperty = (field: Field): ts.Node => {
  const typeExpression = createDataType(field.type);
  return ts.factory.createPropertyAssignment(ts.factory.createIdentifier(field.name), typeExpression as ts.Expression);
};

/**
 * Creates a typescript data schema type from internal SQL schema representation
 * Example typescript data schema type output: `a.string().required()`
 * @param type SQL IR field type
 * @returns Typescript data schema type in TS Node format
 */
const createDataType = (type: FieldType): ts.Node => {
  if (type.kind === 'Scalar') {
    return ts.factory.createCallExpression(
      ts.factory.createIdentifier(`${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REFERENCE_A}.${getTypescriptDataSchemaType(type.name)}`),
      undefined,
      undefined,
    );
  }

  if (type.kind === 'Enum') {
    return ts.factory.createCallExpression(
      ts.factory.createIdentifier(`${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REFERENCE_A}.${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.ENUM_METHOD}`),
      undefined,
      [
        ts.factory.createArrayLiteralExpression(
          type.values.map((value) => ts.factory.createStringLiteral(value)),
          true,
        ),
      ],
    );
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
    ts.factory.createPropertyAccessExpression(createDataType(type.type) as ts.Expression, ts.factory.createIdentifier(modifier)),
    undefined,
    undefined,
  );
};

const getTypescriptDataSchemaType = (type: string): string => {
  const DEFAULT_DATATYPE = TYPESCRIPT_DATA_SCHEMA_CONSTANTS.STRING_METHOD;
  const tsDataSchemaType = GQL_TYPESCRIPT_DATA_SCHEMA_TYPE_MAP[type.toLowerCase()];
  return tsDataSchemaType ?? DEFAULT_DATATYPE;
};

const createModelDefinition = (model: Model): ts.Node => {
  const properties = model.getFields().map((field) => {
    return createProperty(field);
  });
  return ts.factory.createObjectLiteralExpression(properties as ts.ObjectLiteralElementLike[], true);
};

const createModel = (model: Model): ts.Node => {
  const modelExpr = ts.factory.createCallExpression(
    ts.factory.createIdentifier(`${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REFERENCE_A}.${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.MODEL_METHOD}`),
    undefined,
    [createModelDefinition(model) as ts.Expression],
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
export const createSchema = (schema: Schema): ts.Node => {
  const models = schema.getModels().map((model) => {
    return createModel(model);
  });
  const tsSchema = ts.factory.createCallExpression(
    ts.factory.createIdentifier(`${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.REFERENCE_A}.${TYPESCRIPT_DATA_SCHEMA_CONSTANTS.SCHEMA_METHOD}`),
    undefined,
    [ts.factory.createObjectLiteralExpression(models as ts.ObjectLiteralElementLike[], true)],
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
export const createImportExpression = (): ts.Node => {
  return ts.factory.createImportDeclaration(
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
};
