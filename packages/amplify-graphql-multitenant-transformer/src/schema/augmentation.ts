import {
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  TypeNode,
} from 'graphql';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { makeField, makeInputValueDefinition, makeNamedType, makeNonNullType } from 'graphql-transformer-common';
import { MultiTenantDirectiveConfiguration } from '../types';
import { hasTenantField, generateTenantIndexName } from '../utils/helpers';
import { TENANT_INDEX_SORT_KEY } from '../utils/constants';
import { addTenantGlobalSecondaryIndex } from './gsi';

export function addTenantFieldToType(
  config: MultiTenantDirectiveConfiguration,
  context: TransformerContextProvider,
): void {
  const { object, tenantField } = config;
  const typeName = object.name.value;

  // Check if tenant field already exists
  if (hasTenantField(object, tenantField)) {
    return;
  }

  // Create the tenant field (String!)
  const tenantFieldDef: FieldDefinitionNode = makeField(
    tenantField,
    [],
    makeNonNullType(makeNamedType('String')),
  );

  // Get the current type definition from the output schema
  const outputType = context.output.getType(typeName) as ObjectTypeDefinitionNode;
  if (!outputType) {
    throw new Error(`Type '${typeName}' not found in output schema`);
  }

  // Add the tenant field to the type
  const updatedType: ObjectTypeDefinitionNode = {
    ...outputType,
    fields: [...(outputType.fields || []), tenantFieldDef],
  };

  // Update the type in the output schema
  context.output.putType(updatedType);
}

/**
 * Add tenant field to input types (CreateInput, UpdateInput, etc.)
 */
export function addTenantFieldToInputTypes(
  config: MultiTenantDirectiveConfiguration,
  context: TransformerContextProvider,
): void {
  const { object, tenantField } = config;
  const typeName = object.name.value;

  // Add to Create input (optional for user, will be auto-populated)
  const createInputName = `Create${typeName}Input`;
  const createInput = context.output.getType(createInputName) as InputObjectTypeDefinitionNode;
  
  if (createInput && createInput.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION) {
    // Check if field already exists
    const fieldExists = createInput.fields?.some((f) => f.name.value === tenantField);
    
    if (!fieldExists) {
      const tenantInputField: InputValueDefinitionNode = makeInputValueDefinition(
        tenantField,
        makeNamedType('String'), // Optional in input, will be auto-set
      );

      const updatedCreateInput: InputObjectTypeDefinitionNode = {
        ...createInput,
        fields: [...(createInput.fields || []), tenantInputField],
      };

      context.output.putType(updatedCreateInput);
    }
  }

  // Update input should not allow changing tenant field
  // We intentionally don't add tenantField to UpdateInput for security
}

/**
 * Add GSI for tenant-based queries
 */
export function addTenantGSI(
  config: MultiTenantDirectiveConfiguration,
  context: TransformerContextProvider,
): void {
  const { object, sortKeyFields } = config;
  const typeName = object.name.value;

  // Only check/add default sort key if no custom sort keys are provided
  if (!sortKeyFields || sortKeyFields.length === 0) {
    const createdAtField = object.fields?.find((f) => f.name.value === TENANT_INDEX_SORT_KEY);
    
    if (!createdAtField) {
      const outputType = context.output.getType(typeName) as ObjectTypeDefinitionNode;
      
      if (outputType) {
        const createdAtFieldDef: FieldDefinitionNode = makeField(
          TENANT_INDEX_SORT_KEY,
          [],
          makeNonNullType(makeNamedType('AWSDateTime')),
        );

        const updatedType: ObjectTypeDefinitionNode = {
          ...outputType,
          fields: [...(outputType.fields || []), createdAtFieldDef],
        };

        context.output.putType(updatedType);
      }
    }
  }

  addTenantGlobalSecondaryIndex(config, context);
}

/**
 * Add or modify list query field to support tenant filtering
 */
export function ensureListQueryField(
  config: MultiTenantDirectiveConfiguration,
  context: TransformerContextProvider,
): void {
  const { object } = config;
  const typeName = object.name.value;
  const queryTypeName = 'Query';
  const listFieldName = `list${typeName}s`;

  // Get the Query type
  const queryType = context.output.getType(queryTypeName) as ObjectTypeDefinitionNode;
  
  if (!queryType) {
    return;
  }
}

/**
 * Augment schema with all necessary changes for multi-tenant support
 * Note: GSI creation is NOT done here because data sources don't exist yet
 */
export function augmentSchemaForMultiTenant(
  config: MultiTenantDirectiveConfiguration,
  context: TransformerContextProvider,
): void {
  // Add tenant field to the type
  addTenantFieldToType(config, context);

  // Add tenant field to input types
  addTenantFieldToInputTypes(config, context);

  // Note: GSI is added in generateResolvers phase when data sources exist
  // See: addTenantGSI() is called from graphql-multi-tenant-transformer.ts

  // Ensure list query field exists
  ensureListQueryField(config, context);
}
