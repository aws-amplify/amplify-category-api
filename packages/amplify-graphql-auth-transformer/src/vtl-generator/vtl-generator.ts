import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import { ConfiguredAuthProviders, RelationalPrimaryMapConfig, RoleDefinition } from '../utils';

export interface AuthVTLGenerator {
  generateAuthExpressionForCreate: (
    ctx: TransformerContextProvider,
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
  ) => string;

  generateAuthExpressionForUpdate: (
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
  ) => string;

  generateAuthRequestExpression: (ctx: TransformerContextProvider, def: ObjectTypeDefinitionNode) => string;

  generateAuthExpressionForDelete: (
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
  ) => string;

  generateAuthExpressionForField: (
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
    fieldName: string | undefined, // Default 'undefined'
  ) => string;

  generateFieldAuthResponse: (operation: string, fieldName: string, subscriptionsEnabled: boolean) => string;

  generateAuthExpressionForQueries: (
    ctx: TransformerContextProvider,
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
    def: ObjectTypeDefinitionNode,
    indexName: string | undefined, // Default 'undefined'
  ) => string;

  generateAuthExpressionForSearchQueries: (
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
    allowedAggFields: Array<string>,
  ) => string;

  generateAuthExpressionForSubscriptions: (providers: ConfiguredAuthProviders, roles: Array<RoleDefinition>) => string;

  setDeniedFieldFlag: (operation: string, subscriptionsEnabled: boolean) => string;

  generateAuthExpressionForRelationQuery: (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    field: FieldDefinitionNode,
    relatedModelObject: ObjectTypeDefinitionNode,
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
  ) => string;

  generateFieldResolverForOwner: (entity: string) => string;

  generateSandboxExpressionForField: (sandboxEnabled: boolean, genericIamAccessEnabled: boolean) => string;
}
