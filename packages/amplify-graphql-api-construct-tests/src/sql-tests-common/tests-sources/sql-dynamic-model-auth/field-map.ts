import { FieldMap } from '../../../utils/sql-crudl-helper';

export const TodoPrivateFieldMap: FieldMap = {
  id: true,
  content: true,
};

export const TodoOwnerFieldMap: FieldMap = {
  id: true,
  content: true,
  owner: true,
};

export const TodoOwnerFieldStringFieldMap: FieldMap = {
  id: true,
  content: true,
  author: true,
};

export const TodoOwnerFieldListFieldMap: FieldMap = {
  id: true,
  content: true,
  authors: true,
};

export const TodoStaticGroupFieldMap: FieldMap = {
  id: true,
  content: true,
};

export const TodoGroupFieldStringFieldMap: FieldMap = {
  id: true,
  content: true,
  groupField: true,
};

export const TodoGroupFieldListFieldMap: FieldMap = {
  id: true,
  content: true,
  groupsField: true,
};

export const TodoNonModelFieldMap: FieldMap = {
  id: true,
  content: true,
};

export const TodoOwnerAndGroupFieldMap: FieldMap = {
  id: true,
  content: true,
  owners: true,
  groupsField: true,
};

// OIDC Field auth types

export const TodoPrivateContentVarious: FieldMap = {
  id: true,
  owner: true,
  authors: true,
  customGroup: true,
  customGroups: true,
  privateContent: true,
  publicContent: true,
  ownerContent: true,
  ownersContent: true,
  adminContent: true,
  groupContent: true,
  groupsContent: true,
};

export const TodoOwnerContentVarious = {
  id: true,
  owner: true,
  authors: true,
  customGroup: true,
  customGroups: true,
  privateContent: true,
  publicContent: true,
  ownerContent: true,
  ownersContent: true,
  adminContent: true,
  groupContent: true,
  groupsContent: true,
};

export const TodoCustomOwnerContentVarious = {
  customId: true,
  author: true,
  privateContent: true,
  publicContent: true,
  ownerContent: true,
};

export const TodoCustomOwnersContentVarious = {
  customId: true,
  authors: true,
  privateContent: true,
  publicContent: true,
  ownersContent: true,
};

export const TodoAdminContentVarious = {
  id: true,
  owner: true,
  authors: true,
  customGroup: true,
  customGroups: true,
  privateContent: true,
  publicContent: true,
  ownerContent: true,
  ownersContent: true,
  groupContent: true,
  groupsContent: true,
};

export const TodoCustomGroupContentVarious = {
  customId: true,
  owner: true,
  authors: true,
  customGroup: true,
  customGroups: true,
  privateContent: true,
  publicContent: true,
  ownerContent: true,
  ownersContent: true,
  adminContent: true,
  groupsContent: true,
};

export const TodoCustomGroupsContentVarious = {
  customId: true,
  owner: true,
  authors: true,
  customGroup: true,
  customGroups: true,
  privateContent: true,
  publicContent: true,
  ownerContent: true,
  ownersContent: true,
  adminContent: true,
  groupContent: true,
};

export const TodoModel = {
  id: true,
  name: true,
  note: true,
};

export type TodoRenamedFields = {
  id: true;
  privateContent: true;
  author: true;
  authors: true;
  customGroup: true;
  customGroups: true;
  ownerContent: true;
  ownersContent: true;
  adminContent: true;
  groupContent: true;
  groupsContent: true;
};
