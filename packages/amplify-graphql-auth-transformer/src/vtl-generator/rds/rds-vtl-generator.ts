import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { ConfiguredAuthProviders, RoleDefinition, RelationalPrimaryMapConfig } from '../../utils';
import { AuthVTLGenerator } from '../vtl-generator';
import { generateDefaultRDSExpression } from './resolvers';

export class RDSAuthVTLGenerator implements AuthVTLGenerator {
  generateAuthExpressionForCreate = (
    ctx: TransformerContextProvider,
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
  ): string => generateDefaultRDSExpression();

  generateAuthExpressionForUpdate = (
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
  ): string => generateDefaultRDSExpression();

  generateAuthRequestExpression = (): string => generateDefaultRDSExpression();

  generateAuthExpressionForDelete = (
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
  ): string => generateDefaultRDSExpression();

  generateAuthExpressionForField = (
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
    fieldName: string | undefined, // Default 'undefined'
  ): string => generateDefaultRDSExpression();

  generateFieldAuthResponse = (operation: string, fieldName: string, subscriptionsEnabled: boolean): string =>
  generateDefaultRDSExpression();

  generateAuthExpressionForQueries = (
    ctx: TransformerContextProvider,
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
    def: ObjectTypeDefinitionNode,
    indexName: string | undefined,
  ): string => generateDefaultRDSExpression();

  generateAuthExpressionForSearchQueries = (
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
    allowedAggFields: Array<string>,
  ): string => generateDefaultRDSExpression();

  generateAuthExpressionForSubscriptions = (providers: ConfiguredAuthProviders, roles: Array<RoleDefinition>): string =>
    generateDefaultRDSExpression();

  setDeniedFieldFlag = (operation: string, subscriptionsEnabled: boolean): string => generateDefaultRDSExpression();

  generateAuthExpressionForRelationQuery = (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    field: FieldDefinitionNode,
    relatedModelObject: ObjectTypeDefinitionNode,
    providers: ConfiguredAuthProviders,
    roles: Array<RoleDefinition>,
    fields: ReadonlyArray<FieldDefinitionNode>,
  ): string => generateDefaultRDSExpression();

  generateFieldResolverForOwner = (entity: string): string => generateDefaultRDSExpression();

  generateSandboxExpressionForField = (sandboxEnabled: boolean): string => generateDefaultRDSExpression();
}
