import { ObjectTypeDefinitionNode, FieldDefinitionNode, DirectiveNode } from 'graphql';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { isListType } from 'graphql-transformer-common';
import { MultiTenantDirectiveConfiguration } from '../types';
import { DEFAULT_TENANT_FIELD, DEFAULT_TENANT_ID_CLAIM, TENANT_INDEX_PREFIX } from './constants';

export function hasModelDirective(type: ObjectTypeDefinitionNode): boolean {
  return type.directives?.some((dir) => dir.name.value === 'model') ?? false;
}

export function hasMultiTenantDirective(type: ObjectTypeDefinitionNode): boolean {
  return type.directives?.some((dir) => dir.name.value === 'multiTenant') ?? false;
}

export function getMultiTenantDirective(type: ObjectTypeDefinitionNode): DirectiveNode | undefined {
  return type.directives?.find((dir) => dir.name.value === 'multiTenant');
}

export function generateTenantIndexName(typeName: string, tenantField: string = DEFAULT_TENANT_FIELD): string {
  return `${TENANT_INDEX_PREFIX}`;
}

export function hasTenantField(type: ObjectTypeDefinitionNode, tenantField: string = DEFAULT_TENANT_FIELD): boolean {
  return type.fields?.some((field) => field.name.value === tenantField) ?? false;
}

export function validateMultiTenantConfig(
  config: MultiTenantDirectiveConfiguration,
  context: TransformerContextProvider,
): void {
  const { object, tenantField, tenantIdClaim } = config;

  if (!hasModelDirective(object)) {
    throw new Error(
      `@multiTenant directive can only be used on types with @model directive. ` +
      `Add @model to type '${object.name.value}': type ${object.name.value} @model @multiTenant { ... }`,
    );
  }

  if (!tenantField || tenantField.trim() === '') {
    throw new Error(`tenantField must be a non-empty string. Type: ${object.name.value}`);
  }

  if (!tenantIdClaim || tenantIdClaim.trim() === '') {
    throw new Error(`tenantIdClaim must be a non-empty string. Type: ${object.name.value}`);
  }
}

export function generateVTL(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

export function getMultiTenantTypes(context: TransformerContextProvider): ObjectTypeDefinitionNode[] {
  const schema = context.output.getObject('schema');
  if (!schema) {
    return [];
  }

  const types: ObjectTypeDefinitionNode[] = [];
  for (const [typeName, type] of Object.entries(context.output.getTypeDefinitionsOfKind('ObjectTypeDefinition'))) {
    const objectType = type as ObjectTypeDefinitionNode;
    if (hasMultiTenantDirective(objectType) && hasModelDirective(objectType)) {
      types.push(objectType);
    }
  }

  return types;
}

export function getResolverResourceId(typeName: string, fieldName: string): string {
  return `${typeName}${fieldName}Resolver`;
}

export function getBypassAuthTypeCheck(bypassAuthTypes?: string[]): string {
  if (!bypassAuthTypes || bypassAuthTypes.length === 0) {
    return 'false';
  }

  const checks = bypassAuthTypes.map((authType) => {
    switch (authType) {
      case 'IAM':
        return '$util.authType() == "IAM Authorization"';
      case 'API_KEY':
        return '$util.authType() == "API Key Authorization"';
      case 'AMAZON_COGNITO_USER_POOLS':
        return '$util.authType() == "User Pool Authorization"';
      case 'AWS_LAMBDA':
        return '$util.authType() == "Lambda Authorization"';
      case 'OPENID_CONNECT':
        return '$util.authType() == "OpenID Connect Authorization"';
      default:
        return `$util.authType() == "${authType}"`;
    }
  });

  return checks.join(' || ');
}
