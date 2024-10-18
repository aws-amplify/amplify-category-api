import { ObjectTypeDefinitionNode, parse } from 'graphql';
import { isObjectTypeDefinitionNode } from '@aws-amplify/graphql-transformer-core';
import { extendNodeWithDirectives, getNonModelTypes, makeDirective } from '../definition';

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

describe('extendNodeWithDirectives', () => {
  it('should extend an object with one directive if the object does not already have directives', () => {
    const doc = parse(/* GraphQL */ `
      type Foo {
        id: ID!
      }
    `);

    const object = doc.definitions.find(isObjectTypeDefinitionNode)!;
    expect(object?.directives?.length).toEqual(0);

    const updatedObject = extendNodeWithDirectives(object, [makeDirective('dir0', [])]);

    expect(updatedObject.directives?.length).toEqual(1);
    expect(updatedObject?.directives?.[0].name.value).toEqual('dir0');
  });

  it('should extend an object with one directive if the object already has directives', () => {
    const doc = parse(/* GraphQL */ `
      type Foo @existingDir0 @existingDir1 {
        id: ID!
      }
    `);

    const object = doc.definitions.find(isObjectTypeDefinitionNode)!;
    expect(object?.directives?.length).toEqual(2);

    const updatedObject = extendNodeWithDirectives(object, [makeDirective('dir0', [])]);

    expect(updatedObject.directives?.length).toEqual(3);
    expect(updatedObject?.directives?.[2].name.value).toEqual('dir0');
  });

  it('should extend an object with multiple directives if the object does not already have directives', () => {
    const doc = parse(/* GraphQL */ `
      type Foo {
        id: ID!
      }
    `);

    const object = doc.definitions.find(isObjectTypeDefinitionNode)!;
    expect(object?.directives?.length).toEqual(0);

    const updatedObject = extendNodeWithDirectives(object, [makeDirective('dir0', []), makeDirective('dir1', [])]);

    expect(updatedObject.directives?.length).toEqual(2);
    expect(updatedObject?.directives?.[0].name.value).toEqual('dir0');
    expect(updatedObject?.directives?.[1].name.value).toEqual('dir1');
  });

  it('should extend an object with multiple directives if the object already has directives', () => {
    const doc = parse(/* GraphQL */ `
      type Foo @existingDir0 @existingDir1 {
        id: ID!
      }
    `);

    const object = doc.definitions.find(isObjectTypeDefinitionNode)!;
    expect(object?.directives?.length).toEqual(2);

    const updatedObject = extendNodeWithDirectives(object, [makeDirective('dir0', []), makeDirective('dir1', [])]);

    expect(updatedObject.directives?.length).toEqual(4);
    expect(updatedObject?.directives?.[2].name.value).toEqual('dir0');
    expect(updatedObject?.directives?.[3].name.value).toEqual('dir1');
  });

  it('should not add duplicate directives', () => {
    const doc = parse(/* GraphQL */ `
      type Foo @existingDir0 @existingDir1 {
        id: ID!
      }
    `);

    const object = doc.definitions.find(isObjectTypeDefinitionNode)!;
    expect(object?.directives?.length).toEqual(2);

    const updatedObject = extendNodeWithDirectives(object, [makeDirective('existingDir0', []), makeDirective('dir1', [])]);

    expect(updatedObject.directives?.length).toEqual(3);
    expect(updatedObject?.directives?.[0].name.value).toEqual('existingDir0');
    expect(updatedObject?.directives?.[1].name.value).toEqual('existingDir1');
    expect(updatedObject?.directives?.[2].name.value).toEqual('dir1');
  });

  it('should return the object unchanged if directives is empty', () => {
    const doc = parse(/* GraphQL */ `
      type Foo @existingDir0 @existingDir1 {
        id: ID!
      }
    `);

    const object = doc.definitions.find(isObjectTypeDefinitionNode)!;
    expect(object?.directives?.length).toEqual(2);

    const updatedObject = extendNodeWithDirectives(object, []);

    expect(updatedObject).toBe(object);
  });

  it('should return the object unchanged if multiple directives are specified but all already exist', () => {
    const doc = parse(/* GraphQL */ `
      type Foo @existingDir0 @existingDir1 {
        id: ID!
      }
    `);

    const object = doc.definitions.find(isObjectTypeDefinitionNode)!;
    expect(object?.directives?.length).toEqual(2);

    const updatedObject = extendNodeWithDirectives(object, [makeDirective('existingDir0', []), makeDirective('existingDir1', [])]);

    expect(updatedObject).toBe(object);
  });
});
