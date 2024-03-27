import { DirectiveNode, FieldDefinitionNode, ObjectTypeDefinitionNode, ObjectTypeExtensionNode } from 'graphql';
import { WritableDraft } from 'immer/dist/types/types-external';

export type HasOneDirectiveConfiguration = {
  directiveName: string;
  object: ObjectTypeDefinitionNode;
  field: FieldDefinitionNode;
  directive: DirectiveNode;
  indexName: string;
  /** `fields` strings passed to `@hasOne(fields:)` */
  fields: string[];
  /** `references` strings passed to `@hasOne(references:)` */
  references: string[];
  /** `FieldDefinitionNode`s for each of the `fields` including type information from the `relatedType`. */
  fieldNodes: FieldDefinitionNode[];
  /** `FieldDefinitionNode`s for each of the `references` including type information from the `relatedType`. */
  referenceNodes: FieldDefinitionNode[];
  relatedType: ObjectTypeDefinitionNode;
  relatedTypeIndex: FieldDefinitionNode[];
  connectionFields: string[];
};

export type HasManyDirectiveConfiguration = {
  directiveName: string;
  object: ObjectTypeDefinitionNode;
  field: FieldDefinitionNode;
  directive: DirectiveNode;
  indexName: string;
  /** `fields` strings passed to `@hasMany(fields:)` */
  fields: string[];
  /** `references` strings passed to `@hasMany(references:)` */
  references: string[];
  /** `FieldDefinitionNode`s for each of the `fields` including type information from the `relatedType`. */
  fieldNodes: FieldDefinitionNode[];
  /** `FieldDefinitionNode`s for each of the `references` including type information from the `relatedType`. */
  referenceNodes: FieldDefinitionNode[];
  relatedType: ObjectTypeDefinitionNode;
  relatedTypeIndex: FieldDefinitionNode[];
  connectionFields: string[];
  limit: number;
};

export type BelongsToDirectiveConfiguration = {
  directiveName: string;
  object: ObjectTypeDefinitionNode;
  field: FieldDefinitionNode;
  directive: DirectiveNode;
  /** `fields` strings passed to `@belongsTo(fields:)` */
  fields: string[];
  /** `references` strings passed to `@belongsTo(references:)` */
  references: string[];
  /** `FieldDefinitionNode`s for each of the `fields` including type information from the `relatedType`. */
  fieldNodes: FieldDefinitionNode[];
  /** `FieldDefinitionNode`s for each of the `references` including type information from the `relatedType`. */
  referenceNodes: FieldDefinitionNode[];
  relatedType: ObjectTypeDefinitionNode;
  relatedField: FieldDefinitionNode;
  relationType: 'hasOne' | 'hasMany';
  relatedTypeIndex: FieldDefinitionNode[];
  connectionFields: string[];
};

export type ManyToManyDirectiveConfiguration = {
  directiveName: string;
  object: ObjectTypeDefinitionNode;
  field: FieldDefinitionNode;
  directive: DirectiveNode;
  relationName: string;
  indexName: string;
  /** `fields` strings passed to `@hasMany(fields:)` */
  fields: string[];
  /** `references` strings passed to `@hasMany(references:)` */
  references: string[];
  /** `FieldDefinitionNode`s for each of the `fields` including type information from the `relatedType`. */
  fieldNodes: FieldDefinitionNode[];
  /** `FieldDefinitionNode`s for each of the `references` including type information from the `relatedType`. */
  referenceNodes: FieldDefinitionNode[];
  relatedType: ObjectTypeDefinitionNode;
  relatedTypeIndex: FieldDefinitionNode[];
  connectionFields: string[];
  limit: number;
};

export type ManyToManyRelation = {
  name: string;
  directive1: ManyToManyDirectiveConfiguration;
  directive2: ManyToManyDirectiveConfiguration;
};

export type ManyToManyPreProcessContext = {
  model: WritableDraft<ObjectTypeDefinitionNode> | WritableDraft<ObjectTypeExtensionNode>;
  field: WritableDraft<FieldDefinitionNode>;
  directive: WritableDraft<DirectiveNode>;
  modelAuthDirectives: WritableDraft<DirectiveNode>[];
  fieldAuthDirectives: WritableDraft<DirectiveNode>[];
  relationName: string;
};

export type ObjectDefinition = ObjectTypeDefinitionNode | ObjectTypeExtensionNode;
