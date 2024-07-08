import {
  getFieldNameFor,
  getPrimaryKeyFieldNodes,
  getPrimaryKeyFields,
  InvalidDirectiveError,
} from '@aws-amplify/graphql-transformer-core';
import {
  FieldMapEntry,
  ResolverReferenceEntry,
  TransformerContextProvider,
  TransformerResourceHelperProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';
import {
  DirectiveNode,
  EnumTypeDefinitionNode,
  FieldDefinitionNode,
  Kind,
  ListValueNode,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  StringValueNode,
} from 'graphql';
import {
  getBaseType,
  isScalarOrEnum,
  makeField,
  makeNamedType,
  makeNonNullType,
  toCamelCase,
  toPascalCase,
  unwrapNonNull,
} from 'graphql-transformer-common';
import { BelongsToDirective, HasManyDirective, HasOneDirective } from '@aws-amplify/graphql-directives';
import {
  BelongsToDirectiveConfiguration,
  HasManyDirectiveConfiguration,
  HasOneDirectiveConfiguration,
  ManyToManyDirectiveConfiguration,
  ReferencesRelationalDirectiveConfiguration,
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
  config: HasOneDirectiveConfiguration | BelongsToDirectiveConfiguration,
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
    throw new InvalidDirectiveError(
      `'references' defined on ${config.object.name.value}.${config.field.name.value} @${config.directive}. Expecting 'fields' only.`,
    );
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
    throw new InvalidDirectiveError(
      `'fields' defined on ${config.object.name.value}.${config.field.name.value} @${config.directive}. Expecting 'references' only.`,
    );
  }

  if (!config.references) {
    throw new InvalidDirectiveError(`Reference fields must be passed to @${config.directiveName} directive for SQL models.`);
  } else if (!Array.isArray(config.references)) {
    config.references = [config.references];
  } else if (config.references.length === 0) {
    throw new InvalidDirectiveError(`No reference fields passed to @${config.directiveName} directive.`);
  }
};

/**
 * Given a {@link ReferencesRelationalDirectiveConfiguration}, this finds the connection field on the associated model by validating that:
 * - associated model's field type matches the type of the source model
 * - associated field has a counterpart directive as defined in {@link getAssociatedRelationalDirectiveTypes}
 * - the number and names of reference fields in the Related type's `belongsTo` directive matches the number and names of the reference
 *   fields in the Primary type's hasOne or hasMany directive.
 * @param config {@link ReferencesRelationalDirectiveConfiguration}
 * @returns the `associatedField: FieldDefinitionNode` and `associatedReferences: string[]`
 */
const getReferencesAssociatedField = (
  config: ReferencesRelationalDirectiveConfiguration,
): { associatedField: FieldDefinitionNode; associatedReferences: string[] } => {
  const { object } = config;

  const expectedBidirectionalErrorMessages = (): string => {
    const associatedDirectiveTypes = getAssociatedRelationalDirectiveTypes(config.directiveName);
    const primaryType = config.directiveName == BelongsToDirective.name ? config.relatedType.name.value : config.object.name.value;
    const associatedDirectiveDescription = associatedDirectiveTypes.map((directiveName) => `@${directiveName}`).join(' or ');
    return (
      `Add a ${associatedDirectiveDescription} field in ${config.relatedType.name.value} to match the @${config.directiveName} ` +
      `field ${config.object.name.value}.${config.field.name.value}, and ensure the number and type of reference fields match the ` +
      `number and type of primary key fields in ${primaryType}.`
    );
  };

  const associatedConnection = config.relatedType.fields?.flatMap((associatedField) => {
    // associated model's field type matches the type of the source model
    if (getBaseType(associatedField.type) !== object.name.value) {
      return [];
    }

    // associated field has a counterpart directive as defined in {@link getAssociatedRelationalDirectiveTypes}
    const associatedRelationalDirective = associatedField.directives?.find((directive) => {
      return getAssociatedRelationalDirectiveTypes(config.directiveName)
        .map((directiveType) => directiveType)
        .includes(directive.name.value);
    });

    // The field has the right base type, but isn't the proper association, so skip to the next candidate
    if (!associatedRelationalDirective) {
      return [];
    }

    // extract the `references` arguments
    const associatedDirectiveReferencesArgNode = associatedRelationalDirective.arguments?.find((arg) => arg.name.value === 'references')
      ?.value as ListValueNode | StringValueNode;

    const getReferencesFromArgNode = (argument: ListValueNode | StringValueNode): string[] => {
      if (argument.kind === 'ListValue') {
        return argument.values.map((value) => (value as StringValueNode).value);
      }
      return [argument.value];
    };
    const associatedReferences = getReferencesFromArgNode(associatedDirectiveReferencesArgNode);

    // Schemas can declare multiple relationships between models (e.g., Post.editor: Person @hasOne... Post.author: Person@hasOne). To make
    // sure we're looking at the right connection field, we'll build a check to make sure that the incoming relational directive matches the
    // associated connection by comparing the "references" names.
    const expectedReferenceFields = config.referenceNodes.map((node) => node.name.value).join(',');
    const actualAssociatedReferenceFields = associatedReferences.join(',');
    if (expectedReferenceFields !== actualAssociatedReferenceFields) {
      return [];
    }

    return [
      {
        associatedField,
        associatedReferences,
      },
    ];
  });

  // If we didn't find any matches, bail. We know there is at least one matching directive from the `if (!associatedRelationalDirective)`
  // validation above, but the key fields don't match.
  if (!associatedConnection || associatedConnection.length === 0) {
    throw new InvalidDirectiveError(`Uni-directional relationships are not supported. ${expectedBidirectionalErrorMessages()}`);
  }

  return associatedConnection[0];
};

/**
 * Compare the types of two {@link FieldDefinitionNode}s for equality for references based relationships as defined below:
 * - Each field's {@link TypeNode} must be either (but don't need to match). {@link ListType} will fail this check.
 *    - {@link NamedType}
 *    - {@link NonNullType} where the underlying type is {@link NamedType}
 * - Each underlying {@link NamedType}.name.value must be equal **or** both must be either `ID` or `String`.
 *
 * Note: argument order doesn't matter.
 * @param a {@link FieldDefinitionNode}
 * @param b {@link FieldDefinitionNode}
 * @returns `boolean` indicating if field types match.
 */
const referenceFieldTypeMatchesPrimaryKey = (a: FieldDefinitionNode, b: FieldDefinitionNode): boolean => {
  // `String` and `ID` are considered equal types for when comparing
  // the Related model's references fields with their counterparts within
  // the Primary model's primary key fields.
  const areEquivalentTypes = (c: string, d: string): boolean => {
    const matching = ['ID', 'String'];
    return c === d || (matching.includes(c) && matching.includes(d));
  };

  const typeA = (unwrapNonNull(a.type) as NamedTypeNode).name.value;
  const typeB = (unwrapNonNull(b.type) as NamedTypeNode).name.value;
  return areEquivalentTypes(typeA, typeB);
};

/**
 * Validates that a given {@link ReferencesRelationalDirectiveConfiguration} is decorated on a non-required (nullable)
 * field.
 *
 * Valid:
 *  `members: [Member] @hasMany(references: 'teamId')
 *  `team: Team @belongsTo(references: 'teamId)`
 *  `project: Project @hasOne(references: 'teamId)`
 *
 * Invalid:
 *  `members: [Member]! @hasMany(references: 'teamId')
 *  `members: [Member!] @hasMany(references: 'teamId')
 *  `members: [Member!]! @hasMany(references: 'teamId')
 *  `team: Team! @belongsTo(references: 'teamId)`
 *  `project: Project! @hasOne(references: 'teamId)`
 * @param config {@link ReferencesRelationalDirectiveConfiguration}
 */
export const validateReferencesRelationalFieldNullability = (config: ReferencesRelationalDirectiveConfiguration): void => {
  const { field, object, relatedType } = config;
  const fieldType = field.type;
  const relatedTypeName = relatedType.name.value;

  if (fieldType.kind === Kind.NON_NULL_TYPE) {
    const fieldDescription =
      `${object.name.value}.${field.name.value}: ` +
      `${config.directiveName === HasManyDirective.name ? `[${relatedTypeName}]` : relatedTypeName}`;
    throw new InvalidDirectiveError(
      `@${config.directiveName} fields must not be required. Change '${fieldDescription}!' to '${fieldDescription}'`,
    );
  }

  if (fieldType.kind === Kind.LIST_TYPE && fieldType.type.kind === Kind.NON_NULL_TYPE) {
    const fieldDescription = (typeDescription: string): string => {
      return `${config.object.name.value}.${config.field.name.value}: ${typeDescription}`;
    };
    const relatedTypeIs = config.directiveName === HasManyDirective.name ? `[${relatedTypeName}!]` : `${relatedTypeName}!`;
    const relatedTypeShould = config.directiveName === HasManyDirective.name ? `[${relatedTypeName}]` : `${relatedTypeName}`;

    throw new InvalidDirectiveError(
      `@${config.directiveName} fields must not be required. Change '${fieldDescription(relatedTypeIs)}' to '${fieldDescription(
        relatedTypeShould,
      )}'`,
    );
  }
};

/**
 * Validates that a given {@link ReferencesRelationalDirectiveConfiguration} conforms to the following rules:
 * - relationship is bidirectional
 *  - hasOne and hasMany have a belongsTo counterpart
 *  - belongsTo has a hasOne or hasMany counterpart
 * - both sides of the relationship have identical `references` arguments defined
 * - the `references` match the primary key of the Primary model
 *   - references[0] is the primaryKey's paritionKey on the Primary model
 *   - references[1...n] are the primaryKey's sortKey(s) on the Primary model
 *   - types match (id / string / number)
 * - the `references` are fields defined on the Related model
 *   - field names match the named `references` arguments
 *   - Related model references fields types match those of the Primary model's primaryKey
 * @param config {@link ReferencesRelationalDirectiveConfiguration}
 */
export const validateReferencesBidirectionality = (config: ReferencesRelationalDirectiveConfiguration): void => {
  const { directiveName, object, references, referenceNodes, relatedType } = config;
  const { associatedReferences } = getReferencesAssociatedField(config);

  // We're validating bi-directionality of all supported directives (hasMany / hasOne / belongsTo).
  // To make the Primary model primaryKey  <--> Related model reference field type validation easier for us,
  // let's move from Source and Associated models to Primary and Related models.
  const primaryModel = directiveName === 'belongsTo' ? relatedType : object;
  const relatedModel = directiveName === 'belongsTo' ? object : relatedType;

  const primaryKeys = getPrimaryKeyFieldNodes(primaryModel);
  const primaryModelName = primaryModel.name.value;
  const relatedModelName = relatedModel.name.value;

  // Checking that the references passed to the directive of connection field on the associated model:
  // - length matches ()
  if (
    !(references.length === associatedReferences.length) ||
    !references.every((reference, index) => reference === associatedReferences[index])
  ) {
    throw new InvalidDirectiveError(
      `The number and type of the reference fields [${associatedReferences.join(',')}] defined for the ${directiveName} relationship ` +
        `between ${primaryModelName} and ${relatedModelName} must match the number and type of the primary key fields in ` +
        `${primaryModelName}.`,
    );
  }

  // Related model references fields types match those of the Primary model's primaryKey
  primaryKeys
    .map((key, index) => [key, referenceNodes[index]])
    .forEach(([primaryKey, referenceField]) => {
      if (!referenceFieldTypeMatchesPrimaryKey(primaryKey, referenceField)) {
        throw new InvalidDirectiveError(
          `Type mismatch between primary key field(s) of ${primaryModelName}` +
            ` and reference fields of ${relatedModelName}.` +
            ` Type of ${primaryModelName}.${primaryKey.name.value} does not match type of ${relatedModelName}.${referenceField.name.value}`,
        );
      }
    });
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
    const outputRelatedType = ctx.output.getObject(relatedTypeName);
    if (outputRelatedType) {
      return outputRelatedType
    } else {
      throw new Error(`Could not find related type with name ${relatedTypeName} while processing relationships.`);
    }
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

const getAssociatedRelationalDirectiveTypes = (sourceRelationalDirectiveType: string): string[] => {
  switch (sourceRelationalDirectiveType) {
    case HasOneDirective.name:
    case HasManyDirective.name:
      return [BelongsToDirective.name];
    case BelongsToDirective.name:
      return [HasOneDirective.name, HasManyDirective.name];
    default:
      throw new Error(`Unexpected directive type ${sourceRelationalDirectiveType}`);
  }
};

export const getReferencesNodes = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration,
  ctx: TransformerContextProvider,
): FieldDefinitionNode[] => {
  const { directiveName, references, relatedType } = config;
  const enums = ctx.output.getTypeDefinitionsOfKind(Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];

  const referenceNodes = references.map((fieldName) => {
    const fieldNode = relatedType.fields!.find((field) => field.name.value === fieldName);

    if (!fieldNode) {
      throw new InvalidDirectiveError(`${fieldName} is not a field in ${relatedType.name.value}`);
    }

    if (!isScalarOrEnum(fieldNode.type, enums)) {
      throw new InvalidDirectiveError(`All references provided to @${directiveName} must be scalar or enum fields.`);
    }

    return fieldNode;
  });

  // Validate that the reference fields have consistent nullability
  const firstReferenceNodeIsNonNull = referenceNodes[0].type.kind === Kind.NON_NULL_TYPE;
  referenceNodes.slice(1).forEach((referenceNode) => {
    const isNonNull = referenceNode.type.kind === Kind.NON_NULL_TYPE;
    if (isNonNull !== firstReferenceNodeIsNonNull) {
      const nonNullReferenceFields = referenceNodes
        .filter((node) => node.type.kind === Kind.NON_NULL_TYPE)
        .map((node) => `'${node.name.value}'`)
        .join(', ');

      const nullableReferenceFields = referenceNodes
        .filter((node) => node.type.kind !== Kind.NON_NULL_TYPE)
        .map((node) => `'${node.name.value}'`)
        .join(', ');

      const referencesDescription = '[' + references.map((reference) => `'${reference}'`).join(', ') + ']';
      const fieldDescription = `@${directiveName}(references: ${referencesDescription}) ${config.object.name.value}.${config.field.name.value}`;
      throw new InvalidDirectiveError(
        `Reference fields defined on related type: '${relatedType.name.value}' for ${fieldDescription} relationship have inconsistent nullability.` +
          `\nRequired fields: ${nonNullReferenceFields}` +
          `\nNullable fields: ${nullableReferenceFields}` +
          `\nUpdate reference fields on type '${relatedType.name.value}' to have consistent nullability -- either all required or all nullable.`,
      );
    }
  });

  return referenceNodes;
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
