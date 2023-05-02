import { generateModelScalarFilterInputName, makeModelSortDirectionEnumObject } from '@aws-amplify/graphql-model-transformer';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  DirectiveNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  Kind,
  ListValueNode,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  StringValueNode,
} from 'graphql';
import {
  blankObject,
  blankObjectExtension,
  extensionWithFields,
  getBaseType,
  isListType,
  isNonNullType,
  isScalar,
  makeField,
  makeInputValueDefinition,
  makeListType,
  makeNamedType,
  makeNonNullType,
  makeScalarKeyConditionForType,
  ModelResourceIDs,
  STANDARD_SCALARS,
  toCamelCase,
  toPascalCase,
  toUpper,
  wrapNonNull,
} from 'graphql-transformer-common';
import { getSortKeyFieldNames } from '@aws-amplify/graphql-transformer-core';
import { WritableDraft } from 'immer/dist/types/types-external';
import {
  BelongsToDirectiveConfiguration,
  HasManyDirectiveConfiguration,
  HasOneDirectiveConfiguration,
  ManyToManyDirectiveConfiguration,
  ObjectDefinition,
} from './types';
import { getConnectionAttributeName, getObjectPrimaryKey, getSortKeyConnectionAttributeName } from './utils';

export const extendTypeWithConnection = (config: HasManyDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { field, object } = config;

  generateModelXConnectionType(config, ctx);

  // Extensions are not allowed to re-declare fields so we must replace it in place.
  const type = ctx.output.getType(object.name.value) as ObjectTypeDefinitionNode;

  if (type?.kind !== Kind.OBJECT_TYPE_DEFINITION && type?.kind !== Kind.INTERFACE_TYPE_DEFINITION) {
    throw new Error(`Expected referenced type to be either and object or interface definition, got ${type?.kind}`);
  }

  const newFields = type.fields!.map((f: FieldDefinitionNode) => {
    if (f.name.value === field.name.value) {
      return makeModelConnectionField(config);
    }

    return f;
  });
  const updatedType = {
    ...type,
    fields: newFields,
  };

  ctx.output.putType(updatedType);
  ensureModelSortDirectionEnum(ctx);
  generateFilterAndKeyConditionInputs(config, ctx);
};

const generateModelXConnectionType = (
  config: HasManyDirectiveConfiguration | HasOneDirectiveConfiguration,
  ctx: TransformerContextProvider,
): void => {
  const { relatedType } = config;
  const tableXConnectionName = ModelResourceIDs.ModelConnectionTypeName(relatedType.name.value);

  if (ctx.output.hasType(tableXConnectionName)) {
    return;
  }

  const connectionType = blankObject(tableXConnectionName);
  let connectionTypeExtension = blankObjectExtension(tableXConnectionName);

  connectionTypeExtension = extensionWithFields(connectionTypeExtension, [
    makeField('items', [], makeNonNullType(makeListType(makeNamedType(relatedType.name.value)))),
  ]);
  connectionTypeExtension = extensionWithFields(connectionTypeExtension, [makeField('nextToken', [], makeNamedType('String'))]);

  ctx.output.addObject(connectionType);
  ctx.output.addObjectExtension(connectionTypeExtension);
};

const generateFilterAndKeyConditionInputs = (config: HasManyDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { relatedTypeIndex } = config;
  const tableXQueryFilterInput = makeModelXFilterInputObject(config, ctx);

  if (!ctx.output.hasType(tableXQueryFilterInput.name.value)) {
    ctx.output.addInput(tableXQueryFilterInput);
  }

  if (relatedTypeIndex.length === 2) {
    const sortKeyType = relatedTypeIndex[1].type;
    const baseType = getBaseType(sortKeyType);
    const namedType = makeNamedType(baseType);
    const sortKeyConditionInput = makeScalarKeyConditionForType(namedType);

    if (!ctx.output.hasType(sortKeyConditionInput.name.value)) {
      ctx.output.addInput(sortKeyConditionInput);
    }
  }
};

const ensureModelSortDirectionEnum = (ctx: TransformerContextProvider): void => {
  if (!ctx.output.hasType('ModelSortDirection')) {
    const modelSortDirection = makeModelSortDirectionEnumObject();
    ctx.output.addEnum(modelSortDirection);
  }
};

/**
 * ensureHasOneConnectionField
 */
export const ensureHasOneConnectionField = (config: HasOneDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const {
    field, fieldNodes, object, relatedType,
  } = config;

  // If fields were explicitly provided to the directive, there is nothing else to do here.
  if (fieldNodes.length > 0) {
    return;
  }

  const primaryKeyField = getObjectPrimaryKey(relatedType);
  const connectionAttributeName = getConnectionAttributeName(
    ctx.featureFlags,
    object.name.value,
    field.name.value,
    primaryKeyField.name.value,
  );
  const sortKeyFields = getSortKeyFields(ctx, relatedType);
  const primaryKeyConnectionFieldType = getPrimaryKeyConnectionFieldType(ctx, primaryKeyField);

  // The nullabilty of connection fields for hasOne depends on the hasOne field
  // Whereas in update input, they are always optional
  const isConnectionFieldsNonNull = isNonNullType(field.type);
  const typeObject = ctx.output.getType(object.name.value) as ObjectTypeDefinitionNode;
  if (typeObject) {
    updateTypeWithConnectionFields(
      ctx,
      typeObject,
      object,
      connectionAttributeName,
      primaryKeyConnectionFieldType,
      field,
      sortKeyFields,
      isConnectionFieldsNonNull,
    );
  }

  const createInputName = ModelResourceIDs.ModelCreateInputObjectName(object.name.value);
  const createInput = ctx.output.getType(createInputName) as InputObjectTypeDefinitionNode;

  if (createInput) {
    //HasOne connenction fields in create input should respect the nullability of the relational field
    updateInputWithConnectionFields(ctx, createInput, object, connectionAttributeName, primaryKeyConnectionFieldType, field, sortKeyFields, isConnectionFieldsNonNull);
  }

  const updateInputName = ModelResourceIDs.ModelUpdateInputObjectName(object.name.value);
  const updateInput = ctx.output.getType(updateInputName) as InputObjectTypeDefinitionNode;
  if (updateInput) {
    //Connection fields in update input should be always nullable which stays consistent with other fields
    updateInputWithConnectionFields(ctx, updateInput, object, connectionAttributeName, primaryKeyConnectionFieldType, field, sortKeyFields, false);
  }

  const filterInputName = toPascalCase(['Model', object.name.value, 'FilterInput']);
  const filterInput = ctx.output.getType(filterInputName) as InputObjectTypeDefinitionNode;
  if (filterInput) {
    updateFilterConnectionInputWithConnectionFields(
      ctx,
      filterInput,
      object,
      connectionAttributeName,
      primaryKeyConnectionFieldType,
      field,
      sortKeyFields,
    );
  }

  const conditionInputName = toPascalCase(['Model', object.name.value, 'ConditionInput']);
  const conditionInput = ctx.output.getType(conditionInputName) as InputObjectTypeDefinitionNode;
  if (conditionInput) {
    updateFilterConnectionInputWithConnectionFields(
      ctx,
      conditionInput,
      object,
      connectionAttributeName,
      primaryKeyConnectionFieldType,
      field,
      sortKeyFields,
    );
  }

  config.connectionFields.push(connectionAttributeName);
  config.connectionFields.push(
    ...getSortKeyFieldNames(relatedType).map(
      it => getSortKeyConnectionAttributeName(object.name.value, field.name.value, it),
    ),
  );
};

/**
 * If the related type is a hasOne relationship, this creates a hasOne relation going the other way
 *    but using the same foreign key name as the hasOne model
 * If the related type is a hasMany relationship, this function sets the foreign key name to the name of the hasMany foreign key
 *    but does not add additional fields as this will be handled by the hasMany directive
 */
export const ensureBelongsToConnectionField = (config: BelongsToDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { relationType, relatedType, relatedField } = config;
  if (relationType === 'hasOne') {
    ensureHasOneConnectionField(config, ctx);
  } else {
    // hasMany
    const primaryKeyField = getObjectPrimaryKey(relatedType);
    config.connectionFields.push(
      getConnectionAttributeName(ctx.featureFlags, relatedType.name.value, relatedField.name.value, primaryKeyField.name.value),
    );
    config.connectionFields.push(
      ...getSortKeyFieldNames(relatedType).map(
        it => getSortKeyConnectionAttributeName(relatedType.name.value, relatedField.name.value, it),
      ),
    );
  }
};

/**
 * ensureHasManyConnectionField
 */
export const ensureHasManyConnectionField = (
  config: HasManyDirectiveConfiguration | ManyToManyDirectiveConfiguration,
  ctx: TransformerContextProvider,
): void => {
  const {
    field, fieldNodes, object, relatedType,
  } = config;

  // If fields were explicitly provided to the directive, there is nothing else to do here.
  if (fieldNodes.length > 0) {
    return;
  }

  const sortKeyFields = getSortKeyFields(ctx, object);

  const primaryKeyField = getObjectPrimaryKey(object);
  const connectionFieldName = primaryKeyField.name.value;
  config.connectionFields.push(
    connectionFieldName,
    ...sortKeyFields.map(it => it.name.value),
  );

  const relatedTypeObject = ctx.output.getType(relatedType.name.value) as ObjectTypeDefinitionNode;
  const connectionAttributeName = getConnectionAttributeName(ctx.featureFlags, object.name.value, field.name.value, connectionFieldName);

  // The nullabilty of connection fields for hasMany depends on the hasMany field
  // Whereas in update input, they are always optional
  const isConnectionFieldsNonNull = isNonNullType(field.type);
  const primaryKeyConnectionFieldType = getPrimaryKeyConnectionFieldType(ctx, primaryKeyField);
  if (relatedTypeObject) {
    updateTypeWithConnectionFields(
      ctx,
      relatedTypeObject,
      object,
      connectionAttributeName,
      primaryKeyConnectionFieldType,
      field,
      sortKeyFields,
      isConnectionFieldsNonNull,
    );
  }

  const createInputName = ModelResourceIDs.ModelCreateInputObjectName(relatedType.name.value);
  const createInput = ctx.output.getType(createInputName) as InputObjectTypeDefinitionNode;

  if (createInput) {
    //HasMany connenction fields in create input should respect the nullability of the belongsTo field of connected model
    updateInputWithConnectionFields(ctx, createInput, object, connectionAttributeName, primaryKeyConnectionFieldType, field, sortKeyFields, isConnectionFieldsNonNull);
  }

  const updateInputName = ModelResourceIDs.ModelUpdateInputObjectName(relatedType.name.value);
  const updateInput = ctx.output.getType(updateInputName) as InputObjectTypeDefinitionNode;

  if (updateInput) {
    //Connection fields in update input should be always nullable which stays consistent with other fields
    updateInputWithConnectionFields(ctx, updateInput, object, connectionAttributeName, primaryKeyConnectionFieldType, field, sortKeyFields, false);
  }

  const filterInputName = toPascalCase(['Model', relatedType.name.value, 'FilterInput']);
  const filterInput = ctx.output.getType(filterInputName) as InputObjectTypeDefinitionNode;
  if (filterInput) {
    updateFilterConnectionInputWithConnectionFields(
      ctx,
      filterInput,
      object,
      connectionAttributeName,
      primaryKeyConnectionFieldType,
      field,
      sortKeyFields,
    );
  }

  const conditionInputName = toPascalCase(['Model', relatedType.name.value, 'ConditionInput']);
  const conditionInput = ctx.output.getType(conditionInputName) as InputObjectTypeDefinitionNode;
  if (conditionInput) {
    updateFilterConnectionInputWithConnectionFields(
      ctx,
      conditionInput,
      object,
      connectionAttributeName,
      primaryKeyConnectionFieldType,
      field,
      sortKeyFields,
    );
  }
};

const getTypeFieldsWithConnectionField = (
  objectFields: FieldDefinitionNode[],
  connectionFieldName: string,
  type: string,
  nonNull = false,
): FieldDefinitionNode[] => {
  const keyFieldExists = objectFields.some(f => f.name.value === connectionFieldName);

  // If the key field already exists then do not change the input.
  if (keyFieldExists) {
    return [];
  }

  return [makeField(connectionFieldName, [], nonNull ? makeNonNullType(makeNamedType(type)) : makeNamedType(type), [])];
};

const getInputFieldsWithConnectionField = (
  inputFields: InputValueDefinitionNode[],
  connectionFieldName: string,
  type: string,
  nonNull = false,
): InputValueDefinitionNode[] => {
  const keyFieldExists = inputFields.some(f => f.name.value === connectionFieldName);

  // If the key field already exists then do not change the input.
  if (keyFieldExists) {
    return [];
  }

  return [makeInputValueDefinition(connectionFieldName, nonNull ? makeNonNullType(makeNamedType(type)) : makeNamedType(type))];
};

const getFilterConnectionInputFieldsWithConnectionField = (
  inputFields: InputValueDefinitionNode[],
  connectionFieldName: string,
  type: string,
): InputValueDefinitionNode[] => {
  const keyFieldExists = inputFields.some(f => f.name.value === connectionFieldName);

  // If the key field already exists then do not change the input.
  if (keyFieldExists) {
    return [];
  }

  return [
    makeInputValueDefinition(
      connectionFieldName,
      makeNamedType(type),
    )];
};

const makeModelConnectionField = (config: HasManyDirectiveConfiguration): FieldDefinitionNode => {
  const {
    field, fields, indexName, relatedType, relatedTypeIndex,
  } = config;
  const args = [
    makeInputValueDefinition('filter', makeNamedType(ModelResourceIDs.ModelFilterInputTypeName(relatedType.name.value))),
    makeInputValueDefinition('sortDirection', makeNamedType('ModelSortDirection')),
    makeInputValueDefinition('limit', makeNamedType('Int')),
    makeInputValueDefinition('nextToken', makeNamedType('String')),
  ];

  // Add sort key input if necessary.
  if (fields.length < 2 && relatedTypeIndex.length > 1) {
    let fieldName;
    let namedType;

    if (relatedTypeIndex.length === 2) {
      const sortKeyField = relatedTypeIndex[1];
      const baseType = getBaseType(sortKeyField.type);

      fieldName = sortKeyField.name.value;
      namedType = makeNamedType(ModelResourceIDs.ModelKeyConditionInputTypeName(baseType));
    } else {
      const sortKeyFieldNames = relatedTypeIndex.slice(1).map(relatedTypeField => relatedTypeField.name.value);

      fieldName = toCamelCase(sortKeyFieldNames);
      namedType = makeNamedType(
        ModelResourceIDs.ModelCompositeKeyConditionInputTypeName(relatedType.name.value, toUpper(indexName ?? 'Primary')),
      );
    }

    args.unshift(makeInputValueDefinition(fieldName, namedType));
  }

  return makeField(
    field.name.value,
    args,
    makeNamedType(ModelResourceIDs.ModelConnectionTypeName(relatedType.name.value)),
    field.directives! as DirectiveNode[],
  );
};

const makeModelXFilterInputObject = (
  config: HasManyDirectiveConfiguration,
  ctx: TransformerContextProvider,
): InputObjectTypeDefinitionNode => {
  const { relatedType } = config;
  const name = ModelResourceIDs.ModelFilterInputTypeName(relatedType.name.value);
  const fields = relatedType
    .fields!.filter((field: FieldDefinitionNode) => {
      const fieldType = ctx.output.getType(getBaseType(field.type));

      return isScalar(field.type) || (fieldType && fieldType.kind === Kind.ENUM_TYPE_DEFINITION);
    })
    .map((field: FieldDefinitionNode) => {
      const baseType = getBaseType(field.type);
      const isList = isListType(field.type);
      const fieldType = ctx.output.getType(getBaseType(field.type));
      let filterTypeName = baseType;

      if (isScalar(field.type) || (fieldType && fieldType.kind === Kind.ENUM_TYPE_DEFINITION)) {
        filterTypeName = ModelResourceIDs.ModelScalarFilterInputTypeName(baseType, false);
      } else if (isList) {
        filterTypeName = ModelResourceIDs.ModelFilterListInputTypeName(baseType, true);
      }

      return {
        kind: Kind.INPUT_VALUE_DEFINITION,
        name: field.name,
        type: makeNamedType(filterTypeName),
        directives: [],
      };
    });

  fields.push(
    makeAdditionalFilterInputField('and', makeListType(makeNamedType(name)) as unknown as NamedTypeNode),
    makeAdditionalFilterInputField('or', makeListType(makeNamedType(name)) as unknown as NamedTypeNode),
    makeAdditionalFilterInputField('not', makeNamedType(name))
  );

  if (ctx.isProjectUsingDataStore()) {
    fields.push(
      makeAdditionalFilterInputField('_deleted', makeNamedType(ModelResourceIDs.ModelScalarFilterInputTypeName(STANDARD_SCALARS.Boolean, false)))
    )
  }

  return {
    kind: 'InputObjectTypeDefinition',
    name: {
      kind: 'Name',
      value: name,
    },
    fields,
    directives: [],
  };
};

const makeAdditionalFilterInputField = (name: string, type: NamedTypeNode) => ({
  kind: Kind.INPUT_VALUE_DEFINITION,
  name: {
    kind: 'Name' as const,
    value: name,
  },
  type,
  directives: [],
})

/**
 * getPartitionKeyField
 */
export const getPartitionKeyField = (ctx: TransformerContextProvider, object: ObjectTypeDefinitionNode): FieldDefinitionNode => {
  const outputObject = ctx.output.getType(object.name.value) as ObjectTypeDefinitionNode;
  if (!outputObject) {
    throw new Error(`Expected to find output object defined for ${object.name.value}, but did not.`);
  }
  return getPartitionKeyFieldNoContext(outputObject);
};

export const getPartitionKeyFieldNoContext = (object: ObjectTypeDefinitionNode | ObjectTypeExtensionNode): FieldDefinitionNode => {
  const fieldMap = new Map<string, FieldDefinitionNode>();
  let name = 'id';

  object.fields!.forEach(field => {
    fieldMap.set(field.name.value, field);

    field.directives!.forEach(directive => {
      if (directive.name.value === 'primaryKey') {
        name = field.name.value;
      }
    });
  });

  return fieldMap.get(name) ?? makeField('id', [], wrapNonNull(makeNamedType('ID')));
};

/**
 * getSortKeyFields
 */
export const getSortKeyFields = (ctx: TransformerContextProvider, object: ObjectTypeDefinitionNode): FieldDefinitionNode[] => {
  const outputObject = ctx.output.getType(object.name.value) as ObjectTypeDefinitionNode;
  if (!outputObject) {
    throw new Error(`Expected to find output object defined for ${object.name.value}, but did not.`);
  }
  return getSortKeyFieldsNoContext(outputObject);
};

export const getSortKeyFieldsNoContext = (object: ObjectTypeDefinitionNode | ObjectTypeExtensionNode): FieldDefinitionNode[] => {
  const fieldMap = new Map<string, FieldDefinitionNode>();

  object.fields!.forEach(field => {
    fieldMap.set(field.name.value, field);
  });

  const sortKeyFields: FieldDefinitionNode[] = [];
  object.fields!.forEach(field => {
    field.directives!.forEach(directive => {
      if (directive.name.value === 'primaryKey') {
        const values = directive.arguments?.find(arg => arg.name.value === 'sortKeyFields')?.value as ListValueNode | StringValueNode;
        if (values) {
          switch (values.kind) {
            case 'StringValue':
              sortKeyFields.push(fieldMap.get(values.value)!);
              break;
            case 'ListValue':
              sortKeyFields.push(...values.values.map(val => fieldMap.get((val as StringValueNode).value)!));
              break;
            default:
              break;
          }
        }
      }
    });
  });

  return sortKeyFields;
};

const getPrimaryKeyConnectionFieldType = (ctx: TransformerContextProvider, primaryKeyField: FieldDefinitionNode): string => (
  ctx.featureFlags.getBoolean('respectPrimaryKeyAttributesOnConnectionField') ? getBaseType(primaryKeyField.type) : 'ID'
);

const updateInputWithConnectionFields = (
  ctx: TransformerContextProvider,
  input: InputObjectTypeDefinitionNode,
  object: ObjectTypeDefinitionNode,
  connectionAttributeName: string,
  primaryKeyConnectionFieldType: string,
  field: FieldDefinitionNode,
  sortKeyFields: FieldDefinitionNode[],
  isConnectionFieldsNonNull: boolean,
): void => {
  const updatedFields = [...input.fields!];
  updatedFields.push(
    ...getInputFieldsWithConnectionField(
      updatedFields,
      connectionAttributeName,
      primaryKeyConnectionFieldType,
      isConnectionFieldsNonNull,
    ),
  );
  sortKeyFields.forEach(it => {
    updatedFields.push(...getInputFieldsWithConnectionField(updatedFields,
      getSortKeyConnectionAttributeName(object.name.value, field.name.value, it.name.value),
      getBaseType(it.type),
      isConnectionFieldsNonNull));
  });
  ctx.output.putType({
    ...input,
    fields: updatedFields,
  });
};

const updateFilterConnectionInputWithConnectionFields = (
  ctx: TransformerContextProvider,
  input: InputObjectTypeDefinitionNode,
  object: ObjectTypeDefinitionNode,
  connectionAttributeName: string,
  primaryKeyConnectionFieldType: string,
  field: FieldDefinitionNode,
  sortKeyFields: FieldDefinitionNode[],
): void => {
  const updatedFields = [...input.fields!];
  updatedFields.push(
    ...getFilterConnectionInputFieldsWithConnectionField(
      updatedFields,
      connectionAttributeName,
      generateModelScalarFilterInputName(primaryKeyConnectionFieldType, false),
    ),
  );
  sortKeyFields.forEach(it => {
    updatedFields.push(...getFilterConnectionInputFieldsWithConnectionField(updatedFields,
      getSortKeyConnectionAttributeName(object.name.value, field.name.value, it.name.value),
      generateModelScalarFilterInputName(getBaseType(it.type), false)));
  });
  ctx.output.putType({
    ...input,
    fields: updatedFields,
  });
};

const updateTypeWithConnectionFields = (
  ctx: TransformerContextProvider,
  targetObject: ObjectTypeDefinitionNode,
  object: ObjectTypeDefinitionNode,
  connectionAttributeName: string,
  primaryKeyConnectionFieldType: string,
  field: FieldDefinitionNode,
  sortKeyFields: FieldDefinitionNode[],
  isConnectionFieldsNonNull: boolean,
): void => {
  const updatedFields = [...targetObject.fields!];
  updatedFields.push(
    ...getTypeFieldsWithConnectionField(updatedFields, connectionAttributeName, primaryKeyConnectionFieldType, isConnectionFieldsNonNull),
  );
  sortKeyFields.forEach(it => {
    updatedFields.push(...getTypeFieldsWithConnectionField(updatedFields,
      getSortKeyConnectionAttributeName(object.name.value, field.name.value, it.name.value),
      getBaseType(it.type),
      isConnectionFieldsNonNull));
  });
  ctx.output.putType({
    ...targetObject,
    fields: updatedFields,
  });
};

/**
 * Given an object definition and some fields, any fields which are not (by name) already a part of the definition will be added
 * @param object The object (made writable by immer) being modified
 * @param fields The fields to be added to the definition
 */
export const addFieldsToDefinition = (
  object: WritableDraft<ObjectDefinition>,
  fields: FieldDefinitionNode[],
): void => {
  fields.forEach(field => {
    if (!object?.fields?.some(objField => objField.name.value === field.name.value)) {
      object?.fields?.push(field as WritableDraft<FieldDefinitionNode>);
    }
  });
};

/**
 * Given a list of sort key fields on an object, another object with a relational connection to the object, and the field
 * establishing the relational connection, converts the list of sort key fields from the original object to fields ready
 * to be placed on the object establishing the relational connection
 * @param sortKeyFields the original sort key fields from the object with a custom primary key
 * @param object the object defining the relation
 * @param connectingField the field which has the relational directive
 */
export const convertSortKeyFieldsToSortKeyConnectionFields = (
  sortKeyFields: FieldDefinitionNode[],
  object: ObjectDefinition,
  connectingField: FieldDefinitionNode,
): FieldDefinitionNode[] => {
  const createdFields = new Array<FieldDefinitionNode>();
  sortKeyFields.forEach(skf => {
    createdFields.push(...getTypeFieldsWithConnectionField(
      [],
      getSortKeyConnectionAttributeName(object.name.value, connectingField.name.value, skf.name.value),
      getBaseType(skf.type),
      isNonNullType(skf.type),
    ));
  });
  return createdFields;
};