import { HasOneDirectiveConfiguration, HasManyDirectiveConfiguration } from '../types';
import { makeGetItemConnectionWithKeyResolver } from '../resolvers';
import { DDBRelationalResolverGenerator } from '../resolver/ddb-generator';

/**
 * Utility to create a partial of a given type for mocking purposes. Getting the right fields in place is on you.
 * @param mockFields the fields to pass into your mock, optional.
 * @returns a typed object with the input type, and the provided (or no) fields
 */
const createPartialMock = <T>(mockFields?: Partial<T>): T => (mockFields || {}) as unknown as T;

describe('makeGetItemConnectionWithKeyResolver', () => {
  test('it throws on empty related type index field', () => {
    expect(() =>
      makeGetItemConnectionWithKeyResolver(createPartialMock<HasOneDirectiveConfiguration>({ relatedTypeIndex: [] }), createPartialMock()),
    ).toThrowErrorMatchingInlineSnapshot('"Expected relatedType index fields to be set for connection."');
  });
});

describe('makeQueryConnectionWithKeyResolver', () => {
  test('it requires either fields or connection fields to be populated with values', () => {
    const ddbGenerator = new DDBRelationalResolverGenerator();
    expect(() =>
      ddbGenerator.makeQueryConnectionWithKeyResolver(
        createPartialMock<HasManyDirectiveConfiguration>({
          fields: [],
          connectionFields: [],
        }),
        createPartialMock(),
      ),
    ).toThrowErrorMatchingInlineSnapshot('"Either connection fields or local fields should be populated."');
  });
});
