import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { ConfiguredAuthProviders, ModelOperation, RoleDefinition } from '../../utils';
import { AuthVTLGenerator } from '../vtl-generator';
import {
  generateAuthExpressionForCreate,
  generateAuthExpressionForDelete,
  generateAuthExpressionForField,
  generateAuthExpressionForQueries,
  generateAuthExpressionForRelationQuery,
  generateAuthExpressionForUpdate,
  generateAuthRequestExpression,
  generateDefaultRDSExpression,
  generateFieldAuthResponse,
  generateFieldResolverForOwner,
  generatePostAuthExpressionForField,
  setDeniedFieldFlag,
} from './resolvers';
import { generateAuthExpressionForSubscriptions } from './resolvers/subscription';

export class RDSAuthVTLGenerator implements AuthVTLGenerator {
  generateAuthExpressionForCreate = (
    ctx: TransformerContextProvider,
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
  ): string => generateAuthExpressionForCreate(ctx, providers, roles, fields);

  generateAuthExpressionForUpdate = (
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
  ): string => generateAuthExpressionForUpdate(providers, roles, fields);

  generateAuthRequestExpression = (ctx: TransformerContextProvider, def: ObjectTypeDefinitionNode): string =>
    generateAuthRequestExpression(ctx, def);

  generateAuthExpressionForDelete = (
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
  ): string => generateAuthExpressionForDelete(providers, roles, fields);

  generateAuthExpressionForField = (
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
    fieldName: string | undefined, // Default 'undefined'
  ): string => generateAuthExpressionForField(providers, roles, fields, fieldName);

  generateFieldAuthResponse = (operation: string, fieldName: string, subscriptionsEnabled: boolean): string =>
    generateFieldAuthResponse(operation, fieldName, subscriptionsEnabled);

  generateAuthExpressionForQueries = (
    ctx: TransformerContextProvider,
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
    def: ObjectTypeDefinitionNode,
    indexName: string | undefined,
    operation: ModelOperation,
  ): string => generateAuthExpressionForQueries(ctx, providers, roles, fields, def, indexName, operation);

  generateAuthExpressionForSearchQueries = (
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
    allowedAggFields: Array<string>,
  ): string => generateDefaultRDSExpression(providers.genericIamAccessEnabled);

  generateAuthExpressionForSubscriptions = (providers: ConfiguredAuthProviders, roles: Array<RoleDefinition>): string =>
    generateAuthExpressionForSubscriptions(providers, roles);

  setDeniedFieldFlag = (operation: string, subscriptionsEnabled: boolean): string => setDeniedFieldFlag(operation, subscriptionsEnabled);

  generateAuthExpressionForRelationQuery = (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    field: FieldDefinitionNode,
    relatedModelObject: ObjectTypeDefinitionNode,
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
    operation: ModelOperation,
  ): string => generateAuthExpressionForRelationQuery(ctx, def, field, relatedModelObject, providers, roles, fields, operation);

  generateFieldResolverForOwner = (entity: string): string => generateFieldResolverForOwner(entity);

  generatePostAuthExpressionForField = (sandboxEnabled: boolean, genericIamAccessEnabled: boolean): string =>
    generatePostAuthExpressionForField(sandboxEnabled, genericIamAccessEnabled);
}
