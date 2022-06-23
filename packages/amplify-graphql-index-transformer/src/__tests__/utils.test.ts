import { IndexDirectiveConfiguration } from '../types';
import { generateKeyAndQueryNameForConfig } from '../utils';

const generateIndexDirectiveConfiguration = ({
  modelName,
  fieldName,
  sortKeyFields,
}: { modelName: string, fieldName: string, sortKeyFields: string[] }): IndexDirectiveConfiguration => ({
  object: {
    kind: 'ObjectTypeDefinition',
    name: { kind: 'Name', value: modelName },
  },
  field: {
    kind: 'FieldDefinition',
    name: { kind: 'Name', value: fieldName },
    type: {
      kind: 'NamedType',
      name: { kind: 'Name', value: '' },
    },
  },
  directive: {
    kind: 'Directive',
    name: { kind: 'Name', value: '' },
  },
  sortKeyFields,
  sortKey: [],
  modelDirective: {
    kind: 'Directive',
    name: { kind: 'Name', value: '' },
  },
  name: null,
  queryField: null,
  primaryKeyField: {
    kind: 'FieldDefinition',
    name: { kind: 'Name', value: '' },
    type: {
      kind: 'NamedType',
      name: { kind: 'Name', value: '' },
    },
  },
});

describe('generateKeyAndQueryNameForConfig', () => {
  it('generates for a model and field with model name included', () => {
    expect(generateKeyAndQueryNameForConfig(generateIndexDirectiveConfiguration({
      modelName: 'Employee', fieldName: 'manager', sortKeyFields: [],
    }))).toEqual('employeesByManager');
  });

  it('generates for a model, field, and single sort key with model name included', () => {
    expect(generateKeyAndQueryNameForConfig(generateIndexDirectiveConfiguration({
      modelName: 'Employee', fieldName: 'manager', sortKeyFields: ['level'],
    }))).toEqual('employeesByManagerAndLevel');
  });

  it('generates for a model, field, and multiple sort keys with model name included', () => {
    expect(generateKeyAndQueryNameForConfig(generateIndexDirectiveConfiguration({
      modelName: 'Employee', fieldName: 'manager', sortKeyFields: ['level', 'tenure', 'role'],
    }))).toEqual('employeesByManagerAndLevelAndTenureAndRole');
  });

  it('handles model pluralization in a sane way', () => {
    expect(generateKeyAndQueryNameForConfig(generateIndexDirectiveConfiguration({
      modelName: 'Moss', fieldName: 'treeId', sortKeyFields: [],
    }))).toEqual('mossesByTreeId');
  });
});
