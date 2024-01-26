import ts from 'typescript';
import { Field, FieldType, Model, Schema } from '../schema-representation';

const TYPEBEAST_SCHEMA_PACKAGE = '@aws-amplify/data-schema';
const TYPEBEAST_MODEL_METHOD = 'model';
const TYPEBEAST_SCHEMA_METHOD = 'schema';
const TYPEBEAST_IDENTIFIER_METHOD = 'identifier';
const TYPEBEAST_ARRAY_METHOD = 'array';
const TYPEBEAST_REQUIRED_METHOD = 'required';
const TYPEBEAST_STRING_METHOD = 'string';
const TYPEBEAST_ENUM_METHOD = 'enum';
const TYPEBEAST_REFERENCE_A = 'a';
const EXPORT_VARIABLE_NAME = 'schema';

const GQL_TYPEBEAST_TYPE_MAP = {
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

const createProperty = (field: Field): ts.Node => {
  const typeExpression = createDataType(field.type);
  return ts.factory.createPropertyAssignment(ts.factory.createIdentifier(field.name), typeExpression as ts.Expression);
};

const createDataType = (type: FieldType): ts.Node => {
  if (type.kind === 'Scalar') {
    return ts.factory.createCallExpression(
      ts.factory.createIdentifier(`${TYPEBEAST_REFERENCE_A}.${getTypebeastDataType(type.name)}`),
      undefined,
      undefined,
    );
  }

  if (type.kind === 'Enum') {
    return ts.factory.createCallExpression(ts.factory.createIdentifier(`${TYPEBEAST_REFERENCE_A}.${TYPEBEAST_ENUM_METHOD}`), undefined, [
      ts.factory.createArrayLiteralExpression(
        type.values.map((value) => ts.factory.createStringLiteral(value)),
        true,
      ),
    ]);
  }

  // We do not import any Database type as 'Custom' type.
  // In case if there is a custom type in the IR schema, we will import it as string.
  if (type.kind === 'Custom') {
    return ts.factory.createCallExpression(
      ts.factory.createIdentifier(`${TYPEBEAST_REFERENCE_A}.${TYPEBEAST_STRING_METHOD}`),
      undefined,
      undefined,
    );
  }

  // List or NonNull
  const modifier = type.kind === 'List' ? TYPEBEAST_ARRAY_METHOD : TYPEBEAST_REQUIRED_METHOD;
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(createDataType(type.type) as ts.Expression, ts.factory.createIdentifier(modifier)),
    undefined,
    undefined,
  );
};

const getTypebeastDataType = (type: string): string => {
  const DEFAULT_DATATYPE = TYPEBEAST_STRING_METHOD;
  const typebeastType = GQL_TYPEBEAST_TYPE_MAP[type.toLowerCase()];
  return typebeastType ?? DEFAULT_DATATYPE;
};

const createModelDefinition = (model: Model): ts.Node => {
  const properties = model.getFields().map((field) => {
    return createProperty(field);
  });
  return ts.factory.createObjectLiteralExpression(properties as ts.ObjectLiteralElementLike[], true);
};

const createModel = (model: Model): ts.Node => {
  const modelExpr = ts.factory.createCallExpression(
    ts.factory.createIdentifier(`${TYPEBEAST_REFERENCE_A}.${TYPEBEAST_MODEL_METHOD}`),
    undefined,
    [createModelDefinition(model) as ts.Expression],
  );

  const modelExprWithPK = ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(modelExpr, ts.factory.createIdentifier(TYPEBEAST_IDENTIFIER_METHOD)),
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
 * Creates a typebeast schema from internal SQL schema representation
 * Example Typebeast schema:
 * ```
 * export const schema = a.schema({              <--- createSchema()
 *   User: a.model({                             <--- createModel()
 *     id: a.string().required(),                <--- createProperty()
 *     name: a.string(),
 *     status: a.enum(['ACTIVE', 'INACTIVE']),
 *   }),
 * });
 * @param schema
 * @returns Typebeast schema in TS Node format
 */
export const createSchema = (schema: Schema): ts.Node => {
  const models = schema.getModels().map((model) => {
    return createModel(model);
  });
  const tsSchema = ts.factory.createCallExpression(
    ts.factory.createIdentifier(`${TYPEBEAST_REFERENCE_A}.${TYPEBEAST_SCHEMA_METHOD}`),
    undefined,
    [ts.factory.createObjectLiteralExpression(models as ts.ObjectLiteralElementLike[], true)],
  );
  return ts.factory.createVariableStatement(
    [exportModifier],
    ts.factory.createVariableDeclarationList(
      [ts.factory.createVariableDeclaration(ts.factory.createIdentifier(EXPORT_VARIABLE_NAME), undefined, undefined, tsSchema)],
      ts.NodeFlags.Const,
    ),
  );
};

export const createImportExpression = (): ts.Node => {
  return ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamedImports([
        ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(TYPEBEAST_REFERENCE_A)),
      ]),
    ),
    ts.factory.createStringLiteral(TYPEBEAST_SCHEMA_PACKAGE),
  );
};
