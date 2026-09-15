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
