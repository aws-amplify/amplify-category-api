import { getNonModelTypes, findMatchingField } from '../definition';
import { FieldDefinitionNode, ObjectTypeDefinitionNode, parse } from 'graphql';

const testModel = `
    type Post @model {
        id: ID!
        title: String
    }
`;

describe('gets Non-Model Types', () => {
  it('should return empty list if no non-model types', () => {
    const document = parse(testModel);
    const nonModelTypes = getNonModelTypes(document);
    expect(nonModelTypes).toEqual([]);
  });

  it('should return non-model types', () => {
    const testDocument = parse(`
            type Post @model {
                id: ID!
                nonModel: NonModel
            }

            type NonModel {
                id: ID!
            }
        `);
    const nonModelTypes = getNonModelTypes(testDocument);
    expect(nonModelTypes).toHaveLength(1);
    expect((nonModelTypes[0] as ObjectTypeDefinitionNode).name?.value).toEqual('NonModel');
  });
});

describe('finds matching field', () => {
  it('should return undefined if no matching field', () => {
    const document = parse(testModel);
    const fieldToMatch = {
      name: {
        value: 'nonExistentField',
      },
    } as FieldDefinitionNode;
    const field = findMatchingField(fieldToMatch, document.definitions[0] as ObjectTypeDefinitionNode, document);
    expect(field).toBeUndefined();
  });

  it('should return matching field', () => {
    const document = parse(testModel);
    const fieldToMatch = {
      name: {
        value: 'title',
      },
    } as FieldDefinitionNode;
    const field = findMatchingField(fieldToMatch, document.definitions[0] as ObjectTypeDefinitionNode, document);
    expect(field).toBeDefined();
    expect(field?.name?.value).toEqual('title');
  });
});
