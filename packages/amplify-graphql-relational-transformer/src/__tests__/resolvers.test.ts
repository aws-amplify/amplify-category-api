import { DDB_DB_TYPE } from '@aws-amplify/graphql-transformer-core';
import { HasOneDirectiveConfiguration, HasManyDirectiveConfiguration } from '../types';
import { getGenerator } from '../resolver/generator-factory';
import { setFieldMappingResolverReference } from '../resolvers';

/**
 * Utility to create a partial of a given type for mocking purposes. Getting the right fields in place is on you.
 * @param mockFields the fields to pass into your mock, optional.
 * @returns a typed object with the input type, and the provided (or no) fields
 */
const createPartialMock = <T>(mockFields?: Partial<T>): T => (mockFields || {}) as unknown as T;

describe('makeGetItemConnectionWithKeyResolver', () => {
  test('it throws on empty related type index field', () => {
    const generator = getGenerator(DDB_DB_TYPE);
    expect(() =>
      generator.makeHasOneGetItemConnectionWithKeyResolver(
        createPartialMock<HasOneDirectiveConfiguration>({ relatedTypeIndex: [] }),
        createPartialMock(),
      ),
    ).toThrowErrorMatchingInlineSnapshot('"Expected relatedType index fields to be set for connection."');
  });
});

describe('makeQueryConnectionWithKeyResolver', () => {
  test('it requires either fields or connection fields to be populated with values', () => {
    const generator = getGenerator(DDB_DB_TYPE);
    expect(() =>
      generator.makeHasManyGetItemsConnectionWithKeyResolver(
        createPartialMock<HasManyDirectiveConfiguration>({
          fields: [],
          connectionFields: [],
        }),
        createPartialMock(),
        [],
        []
      ),
    ).toThrowErrorMatchingInlineSnapshot('"Either connection fields or local fields should be populated."');
  });
});

describe('set field mapping resolver reference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const mockContext = {
    resourceHelper: {
      getModelFieldMap: jest.fn(),
    },
  } as any;
  const modelName = 'User';
  const typeName = 'User';
  const fieldName = 'profile';

  it('adds resolver reference if model has mapped field names', () => {
    const mockAddResolverRef = jest.fn().mockReturnValueOnce({});
    mockContext.resourceHelper.getModelFieldMap.mockReturnValueOnce({
      getMappedFields: jest.fn().mockReturnValueOnce([{ details: 'description' }]),
      addResolverReference: mockAddResolverRef,
    });
    setFieldMappingResolverReference(mockContext, modelName, typeName, fieldName, true);
    expect(mockAddResolverRef).toBeCalledTimes(1);
    expect(mockAddResolverRef).toBeCalledWith({
      typeName: typeName,
      fieldName: fieldName,
      isList: true,
    });
  });

  it('does not add resolver reference if model has no mapped field names', () => {
    const mockAddResolverRef = jest.fn().mockReturnValueOnce({});
    mockContext.resourceHelper.getModelFieldMap.mockReturnValueOnce({
      getMappedFields: jest.fn().mockReturnValueOnce([]),
      addResolverReference: mockAddResolverRef,
    });
    setFieldMappingResolverReference(mockContext, modelName, typeName, fieldName, true);
    expect(mockAddResolverRef).toBeCalledTimes(0);
  });
});
