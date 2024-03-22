import { getFieldNameFor, getPrimaryKeyFields, InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import {
  FieldMapEntry,
  ResolverReferenceEntry,
  TransformerContextProvider,
  TransformerResourceHelperProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';
import { DirectiveNode, EnumTypeDefinitionNode, FieldDefinitionNode, Kind, ObjectTypeDefinitionNode, StringValueNode } from 'graphql';
import {
  getBaseType,
  isScalarOrEnum,
  makeField,
  makeNamedType,
  makeNonNullType,
  toCamelCase,
  toPascalCase,
} from 'graphql-transformer-common';
import {
  BelongsToDirectiveConfiguration,
  HasManyDirectiveConfiguration,
  HasOneDirectiveConfiguration,
  ManyToManyDirectiveConfiguration,
} from './types';

export const validateParentReferencesFields = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration,
  ctx: TransformerContextProvider,
): void => {
  const { directiveName, object, references, relatedType } = config;
  const enums = ctx.output.getTypeDefinitionsOfKind(Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];

  const primaryKeys = getPrimaryKeyFields(object);
  if (primaryKeys.length !== references.length) {
    throw new InvalidDirectiveError(
      `The number of references provided to @${directiveName} must match the number of primary keys on ${object.name.value}.`,
    );
  }

  for (const reference of references) {
    const fieldNode = relatedType.fields!.find((field) => field.name.value === reference);

    if (!fieldNode) {
      throw new InvalidDirectiveError(`${reference} is not a field in ${relatedType.name.value}`);
    }

    if (!isScalarOrEnum(fieldNode.type, enums)) {
      throw new InvalidDirectiveError(`All reference fields provided to @${directiveName} must be scalar or enum fields.`);
    }
  }
};

export const validateChildReferencesFields = (config: BelongsToDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { directiveName, object, references, relatedType } = config;
  const enums = ctx.output.getTypeDefinitionsOfKind(Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];

  const primaryKeys = getPrimaryKeyFields(relatedType);
  if (primaryKeys.length !== references.length) {
    throw new InvalidDirectiveError(
      `The number of references provided to @${directiveName} must match the number of primary keys on ${relatedType.name.value}.`,
    );
  }

  for (const reference of references) {
    const fieldNode = object.fields!.find((field) => field.name.value === reference);

    if (!fieldNode) {
      throw new InvalidDirectiveError(`${reference} is not a field in ${object.name.value}`);
    }

    if (!isScalarOrEnum(fieldNode.type, enums)) {
      throw new InvalidDirectiveError(`All reference fields provided to @${directiveName} must be scalar or enum fields.`);
    }
  }
};

export const getRelatedTypeIndex = (
  config: HasOneDirectiveConfiguration,
  ctx: TransformerContextProvider,
  indexName?: string,
): FieldDefinitionNode[] => {
  const { directiveName, field, fieldNodes } = config;
  const relatedType = ctx.output.getType(config.relatedType.name.value) as any;
  const fieldMap = new Map<string, FieldDefinitionNode>();
  let partitionFieldName;
  const sortFieldNames = [];
  const sortFields = [];

  for (const relatedTypeField of relatedType.fields!) {
    fieldMap.set(relatedTypeField.name.value, relatedTypeField);

    for (const directive of relatedTypeField.directives!) {
      const relatedDirectiveName = directive.name.value;
      const name = getIndexName(directive);

      if ((!indexName && relatedDirectiveName === 'primaryKey') || (indexName && indexName === name && relatedDirectiveName === 'index')) {
        partitionFieldName = relatedTypeField.name.value;

        /* eslint-disable max-depth */
        for (const argument of directive.arguments!) {
          if (argument.name.value === 'sortKeyFields') {
            if (argument.value.kind === Kind.STRING) {
              sortFieldNames.push(argument.value.value);
            } else if (argument.value.kind === Kind.LIST) {
              for (const keyField of argument.value.values) {
                sortFieldNames.push((keyField as any).value);
              }
            }
          }
        }
        /* eslint-enable max-depth */

        break;
      }
    }
  }

  if (partitionFieldName === undefined) {
    if (indexName) {
      throw new InvalidDirectiveError(`Index ${indexName} does not exist for model ${relatedType.name.value}`);
    }

    partitionFieldName = 'id';
  }

  const partitionField = fieldMap.get(partitionFieldName);
  if (!partitionField) {
    throw new Error(`Expected partition field ${partitionFieldName} to be found in map.`);
  }

  for (const sortFieldName of sortFieldNames) {
    const sortField = fieldMap.get(sortFieldName);

    if (!sortField) {
      throw new Error(`Expected sort field ${sortFieldName} to be found in map.`);
    }
    sortFields.push(sortField);
  }

  if (fieldNodes.length > 0) {
    if (getBaseType(fieldNodes[0].type) !== getBaseType(partitionField.type)) {
      throw new InvalidDirectiveError(`${fieldNodes[0].name.value} field is not of type ${getBaseType(partitionField.type)}`);
    }

    if (fieldNodes.length > 1) {
      if (sortFields.length !== fieldNodes.length - 1) {
        throw new InvalidDirectiveError(`Invalid @${directiveName} directive on ${field.name.value}. Partial sort keys are not accepted.`);
      }

      for (let i = 0; i < sortFields.length; i++) {
        const sortField = sortFields[i];
        const fieldNode = fieldNodes[i + 1];

        if (getBaseType(fieldNode.type) !== getBaseType(sortField.type)) {
          throw new InvalidDirectiveError(`${fieldNode.name.value} field is not of type ${getBaseType(sortField.type)}`);
        }
      }
    }
  }

  return [partitionField, ...sortFields];
};

export const ensureFieldsArray = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration | BelongsToDirectiveConfiguration,
): void => {
  if (config.references) {
    throw new InvalidDirectiveError(`DynamoDB models do not support 'references' on @${config.directiveName} directive.`);
  }

  if (!config.fields) {
    config.fields = [];
  } else if (!Array.isArray(config.fields)) {
    config.fields = [config.fields];
  } else if (config.fields.length === 0) {
    throw new InvalidDirectiveError(`No fields passed to @${config.directiveName} directive.`);
  }
};

export const ensureReferencesArray = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration | BelongsToDirectiveConfiguration,
): void => {
  if (config.fields) {
    throw new InvalidDirectiveError(`Relational database models do not support 'fields' on @${config.directiveName} directive.`);
  }

  if (!config.references) {
    throw new InvalidDirectiveError(`Reference fields must be passed to @${config.directiveName} directive for SQL models.`);
  } else if (!Array.isArray(config.references)) {
    config.references = [config.references];
  } else if (config.references.length === 0) {
    throw new InvalidDirectiveError(`No reference fields passed to @${config.directiveName} directive.`);
  }
};

export const ensureReferencesBidirectionality = (
  config: HasManyDirectiveConfiguration | BelongsToDirectiveConfiguration, // TODO: Add HasOnyDirectiveConfiguration
): void => {
  if (config.fields) {
    throw new InvalidDirectiveError('fields and references cannot be used together.');
  }

  /*
    1. find related directives:
      - if hasMany --> belongsTo
      - if hasOne --> belongsTo
      - if belongsTo --> hasMany | hasOne
    2. find matching propertyName
      - directive.arguments[].references === config.references (order matters)
    3. confirm matching type as sanity check
      - field.type.name.value == config.type


  */
  // const related = config.relatedType;
  // const otherSide = related.fields?.find((field) => {
  //   const hasDirective = field?.directives?.length >= 1
  // })
};

export const getModelDirective = (objectType: ObjectTypeDefinitionNode): DirectiveNode | undefined => {
  return objectType.directives!.find((directive) => directive.name.value === 'model');
};

export const validateModelDirective = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration | BelongsToDirectiveConfiguration | ManyToManyDirectiveConfiguration,
): void => {
  if (!getModelDirective(config.object)) {
    throw new InvalidDirectiveError(`@${config.directiveName} must be on an @model object type field.`);
  }
};

export const getRelatedType = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration | BelongsToDirectiveConfiguration,
  ctx: TransformerContextProvider,
): ObjectTypeDefinitionNode => {
  const { field } = config;
  const relatedTypeName = getBaseType(field.type);
  const relatedType = ctx.inputDocument.definitions.find(
    (d: any) => d.kind === Kind.OBJECT_TYPE_DEFINITION && d.name.value === relatedTypeName,
  ) as ObjectTypeDefinitionNode | undefined;

  if (!relatedType) {
    throw new Error(`Could not find related type with name ${relatedTypeName} while processing relationships.`);
  }
  return relatedType;
};

export const getFieldsNodes = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration | BelongsToDirectiveConfiguration,
  ctx: TransformerContextProvider,
): FieldDefinitionNode[] => {
  const { directiveName, fields, object } = config;
  const enums = ctx.output.getTypeDefinitionsOfKind(Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];

  return fields.map((fieldName) => {
    const fieldNode = object.fields!.find((field) => field.name.value === fieldName);

    if (!fieldNode) {
      throw new InvalidDirectiveError(`${fieldName} is not a field in ${object.name.value}`);
    }

    if (!isScalarOrEnum(fieldNode.type, enums)) {
      throw new InvalidDirectiveError(`All fields provided to @${directiveName} must be scalar or enum fields.`);
    }

    return fieldNode;
  });
};

export const getReferencesNodes = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration,
  ctx: TransformerContextProvider,
): FieldDefinitionNode[] => {
  const { directiveName, references, relatedType } = config;
  const enums = ctx.output.getTypeDefinitionsOfKind(Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];

  return references.map((fieldName) => {
    const fieldNode = relatedType.fields!.find((field) => field.name.value === fieldName);

    if (!fieldNode) {
      // TODO: include more directive / type information to help debugging.
      throw new InvalidDirectiveError(`${fieldName} is not a field in ${relatedType.name.value}`);
    }

    if (!isScalarOrEnum(fieldNode.type, enums)) {
      throw new InvalidDirectiveError(`All references provided to @${directiveName} must be scalar or enum fields.`);
    }

    return fieldNode;
  });
};

export const getBelongsToReferencesNodes = (
  config: BelongsToDirectiveConfiguration,
  ctx: TransformerContextProvider,
): FieldDefinitionNode[] => {
  const { directiveName, references, object } = config;
  const enums = ctx.output.getTypeDefinitionsOfKind(Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];

  return references.map((fieldName) => {
    const fieldNode = object.fields!.find((field) => field.name.value === fieldName);

    if (!fieldNode) {
      throw new InvalidDirectiveError(`${fieldName} is not a field in ${object.name.value}`);
    }

    if (!isScalarOrEnum(fieldNode.type, enums)) {
      throw new InvalidDirectiveError(`All references provided to @${directiveName} must be scalar or enum fields.`);
    }

    return fieldNode;
  });
};

export const validateRelatedModelDirective = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration | BelongsToDirectiveConfiguration,
): void => {
  if (!getModelDirective(config.relatedType)) {
    throw new InvalidDirectiveError(`Object type ${config.relatedType.name.value} must be annotated with @model.`);
  }
};

const getIndexName = (directive: DirectiveNode): string | undefined => {
  for (const argument of directive.arguments!) {
    if (argument.name.value === 'name') {
      return (argument.value as StringValueNode).value;
    }
  }
  return undefined;
};

export const getConnectionAttributeName = (
  transformParameters: TransformParameters,
  type: string,
  field: string,
  relatedTypeField: string,
): string => {
  const nameSuffix = transformParameters.respectPrimaryKeyAttributesOnConnectionField ? relatedTypeField : 'id';
  return toCamelCase([type, field, nameSuffix]);
};

export const getManyToManyConnectionAttributeName = (
  transformParameters: TransformParameters,
  field: string,
  relatedTypeField: string,
): string => {
  const nameSuffix = transformParameters.respectPrimaryKeyAttributesOnConnectionField ? toPascalCase([relatedTypeField]) : 'ID';
  return `${toCamelCase([field])}${nameSuffix}`;
};

export const getSortKeyConnectionAttributeName = (type: string, field: string, relatedTypeField: string): string => {
  return toCamelCase([type, field, relatedTypeField]);
};

export const getBackendConnectionAttributeName = (
  transformParameters: TransformParameters,
  resourceHelper: TransformerResourceHelperProvider,
  type: string,
  field: string,
  relatedTypeField: string,
): string => {
  return getConnectionAttributeName(transformParameters, resourceHelper.getModelNameMapping(type), field, relatedTypeField);
};

export const validateDisallowedDataStoreRelationships = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration,
  ctx: TransformerContextProvider,
): void => {
  // If DataStore is enabled, the following scenario is not supported:
  // Model A includes a @hasOne or @hasMany relationship with Model B, while
  // Model B includes a @hasOne or @hasMany relationship back to Model A.

  if (!ctx.isProjectUsingDataStore()) {
    return;
  }

  const modelType = config.object.name.value;
  const relatedType = ctx.output.getType(config.relatedType.name.value) as ObjectTypeDefinitionNode;
  if (!relatedType) {
    throw new Error(`Expected related type ${config.relatedType.name.value} to be found in output, but did not.`);
  }

  // Recursive relationships on the same type are allowed.
  if (modelType === relatedType.name.value) {
    return;
  }

  const hasUnsupportedConnectionFields = relatedType.fields!.some(
    (field) =>
      // If the related field has the same data type as this model, and @hasOne or @hasMany
      // is present, then the connection is unsupported.
      getBaseType(field.type) === modelType &&
      field.directives!.some((directive) => directive.name.value === 'hasOne' || directive.name.value === 'hasMany'),
  );

  if (hasUnsupportedConnectionFields) {
    throw new InvalidDirectiveError(
      `${modelType} and ${relatedType.name.value} cannot refer to each other via @hasOne or @hasMany when DataStore is in use. Use @belongsTo instead. See https://docs.amplify.aws/cli/graphql/data-modeling/#belongs-to-relationship`,
    );
  }
};

type RegisterForeignKeyMappingParams = {
  transformParameters: TransformParameters;
  resourceHelper: TransformerResourceHelperProvider; // resourceHelper from the transformer context object
  thisTypeName: string; // the "source type" of the relation
  thisFieldName: string; // the field with the relational directive
  relatedType: ObjectTypeDefinitionNode; // the related type
};

/**
 * If thisTypeName maps to a different value, it registers the auto-generated foreign key fields to map to their original name
 */
export const registerHasOneForeignKeyMappings = ({
  transformParameters,
  resourceHelper,
  thisTypeName,
  thisFieldName,
  relatedType,
}: RegisterForeignKeyMappingParams): void => {
  if (resourceHelper.isModelRenamed(thisTypeName)) {
    const currAttrName = getConnectionAttributeName(
      transformParameters,
      thisTypeName,
      thisFieldName,
      getObjectPrimaryKey(relatedType).name.value,
    );
    const origAttrName = getBackendConnectionAttributeName(
      transformParameters,
      resourceHelper,
      thisTypeName,
      thisFieldName,
      getObjectPrimaryKey(relatedType).name.value,
    );

    const modelFieldMap = resourceHelper.getModelFieldMap(thisTypeName);
    modelFieldMap.addMappedField({ currentFieldName: currAttrName, originalFieldName: origAttrName });

    (['create', 'update', 'delete', 'get', 'list', 'sync'] as const).forEach((op) => {
      const opFieldName = getFieldNameFor(op, thisTypeName);
      const opTypeName = op === 'create' || op === 'update' || op === 'delete' ? 'Mutation' : 'Query';
      const opIsList = op === 'list' || op === 'sync';
      modelFieldMap.addResolverReference({ typeName: opTypeName, fieldName: opFieldName, isList: opIsList });
    });
  }

  // register that the related type is referenced by this hasOne field
  // this is necessary because even if this model is not renamed, the related one could be and the field mappings would need to be applied
  // on this resolver
  resourceHelper
    .getModelFieldMap(relatedType.name.value)
    .addResolverReference({ typeName: thisTypeName, fieldName: thisFieldName, isList: false });
};

/**
 * This function is similar to registerHasOneForeignKeyMappings but subtly different. Because hasMany creates a foreign key field on the
 * related type, this function registers the mapping on the related type. It attaches a resolver reference to the hasMany field so the
 * renamed foreign key is mapped when fetching the related object through the hasMany field.
 */
export const registerHasManyForeignKeyMappings = ({
  transformParameters,
  resourceHelper,
  thisTypeName,
  thisFieldName,
  relatedType,
}: RegisterForeignKeyMappingParams): void => {
  if (!resourceHelper.isModelRenamed(thisTypeName)) {
    return;
  }

  const currAttrName = getConnectionAttributeName(
    transformParameters,
    thisTypeName,
    thisFieldName,
    getObjectPrimaryKey(relatedType).name.value,
  );
  const origAttrName = getBackendConnectionAttributeName(
    transformParameters,
    resourceHelper,
    thisTypeName,
    thisFieldName,
    getObjectPrimaryKey(relatedType).name.value,
  );

  const modelFieldMap = resourceHelper.getModelFieldMap(relatedType.name.value);
  modelFieldMap
    .addMappedField({ currentFieldName: currAttrName, originalFieldName: origAttrName })
    .addResolverReference({ typeName: thisTypeName, fieldName: thisFieldName, isList: true });

  (['create', 'update', 'delete', 'get', 'list', 'sync'] as const).forEach((op) => {
    const opFieldName = getFieldNameFor(op, relatedType.name.value);
    const opTypeName = op === 'create' || op === 'update' || op === 'delete' ? 'Mutation' : 'Query';
    const opIsList = op === 'list' || op === 'sync';

    // registers field mappings for CRUD resolvers on related type
    modelFieldMap.addResolverReference({ typeName: opTypeName, fieldName: opFieldName, isList: opIsList });
  });
};

export type ManyToManyForeignKeyMappingParams = {
  resourceHelper: TransformerResourceHelperProvider;
  typeName: string;
  referencedBy: ResolverReferenceEntry[];
  fieldMap: FieldMapEntry[];
};

export const registerManyToManyForeignKeyMappings = ({
  resourceHelper,
  typeName,
  referencedBy,
  fieldMap,
}: ManyToManyForeignKeyMappingParams): void => {
  const modelFieldMap = resourceHelper.getModelFieldMap(typeName);
  fieldMap.forEach(modelFieldMap.addMappedField);
  referencedBy.forEach(modelFieldMap.addResolverReference);

  (['create', 'update', 'delete', 'get', 'list', 'sync'] as const).forEach((op) => {
    const opFieldName = getFieldNameFor(op, typeName);
    const opTypeName = op === 'create' || op === 'update' || op === 'delete' ? 'Mutation' : 'Query';
    const opIsList = op === 'list' || op === 'sync';
    modelFieldMap.addResolverReference({ typeName: opTypeName, fieldName: opFieldName, isList: opIsList });
  });
};

export const getObjectPrimaryKey = (object: ObjectTypeDefinitionNode): FieldDefinitionNode => {
  let primaryKey = makeField('id', [], makeNonNullType(makeNamedType('ID')));

  object.fields!.forEach((objectField) => {
    objectField.directives!.forEach((directive) => {
      if (directive.name.value === 'primaryKey') {
        primaryKey = objectField;
      }
    });
  });

  return primaryKey;
};
