import {
  DirectiveWrapper,
  generateGetArgumentsInput,
  InvalidDirectiveError,
  TransformerPluginBase,
} from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
  TransformerValidationStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { MultiTenantDirective } from '@aws-amplify/graphql-directives';
import {
  DirectiveNode,
  InterfaceTypeDefinitionNode,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { MultiTenantDirectiveConfiguration, MultiTenantMetadata } from './types';
import { validateMultiTenantConfig, hasModelDirective } from './utils/helpers';
import { augmentSchemaForMultiTenant, addTenantGSI } from './schema/augmentation';
import { applyMultiTenantResolvers } from './resolvers/apply';
import {
  DEFAULT_TENANT_FIELD,
  DEFAULT_TENANT_ID_CLAIM,
} from './utils/constants';

export class MultiTenantTransformer extends TransformerPluginBase {
  private directiveList: MultiTenantDirectiveConfiguration[] = [];
  private metadataMap: Map<string, MultiTenantMetadata> = new Map();

  constructor() {
    super('amplify-multi-tenant-transformer', MultiTenantDirective.definition);
  }

  object = (
    definition: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    directive: DirectiveNode,
    context: TransformerSchemaVisitStepContextProvider,
  ): void => {
    if (definition.kind !== 'ObjectTypeDefinition') {
      throw new InvalidDirectiveError(
        `@multiTenant directive can only be used on object types. Found on: ${definition.name.value}`,
      );
    }

    const objectDef = definition as ObjectTypeDefinitionNode;

    if (!hasModelDirective(objectDef)) {
      throw new InvalidDirectiveError(
        `@multiTenant directive can only be used on types with @model directive. Type: ${objectDef.name.value}`,
      );
    }

    const directiveWrapped = new DirectiveWrapper(directive);
    const args = directiveWrapped.getArguments<MultiTenantDirectiveConfiguration>(
      {
        object: objectDef,
        directive,
        tenantField: DEFAULT_TENANT_FIELD,
        tenantIdClaim: DEFAULT_TENANT_ID_CLAIM,
        createIndex: true,
        indexName: '',
        bypassAuthTypes: [],
        sortKeyFields: [],
        projectionType: 'ALL',
        projectionKeys: [],
      },
      generateGetArgumentsInput(context.transformParameters),
    );

    validateMultiTenantConfig(args, context as TransformerContextProvider);
    this.directiveList.push(args);
    const metadata: MultiTenantMetadata = {
      typeName: objectDef.name.value,
      tenantField: args.tenantField,
      tenantIdClaim: args.tenantIdClaim,
      hasIndex: args.createIndex !== false,
      indexName: args.indexName || 'byTenant',
    };
    this.metadataMap.set(objectDef.name.value, metadata);
  };

  validate = (context: TransformerValidationStepContextProvider): void => {
    for (const config of this.directiveList) {
      if (!hasModelDirective(config.object)) {
        throw new InvalidDirectiveError(
          `@multiTenant requires @model directive on type: ${config.object.name.value}`,
        );
      }
    }
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider): void => {
    const ctx = context as TransformerContextProvider;

    for (const config of this.directiveList) {
      augmentSchemaForMultiTenant(config, ctx);
    }
  };

  generateResolvers = (context: TransformerContextProvider): void => {
    for (const config of this.directiveList) {
      const usesPrimaryKeyWithTenantId = this.hasPrimaryKeyWithTenantId(config);
      if (config.createIndex !== false) {
        addTenantGSI(config, context);
      }
      applyMultiTenantResolvers(config, context, usesPrimaryKeyWithTenantId);
    }
  };

  private hasPrimaryKeyWithTenantId(config: MultiTenantDirectiveConfiguration): boolean {
    const { object, tenantField } = config;

    for (const field of object.fields || []) {
      if (field.name.value === tenantField) {
        return field.directives?.some((directive) => directive.name.value === 'primaryKey') ?? false;
      }
    }

    return false;
  }

  public getMetadata(typeName: string): MultiTenantMetadata | undefined {
    return this.metadataMap.get(typeName);
  }

  public isMultiTenant(typeName: string): boolean {
    return this.metadataMap.has(typeName);
  }

  public getMultiTenantTypes(): string[] {
    return Array.from(this.metadataMap.keys());
  }
}
