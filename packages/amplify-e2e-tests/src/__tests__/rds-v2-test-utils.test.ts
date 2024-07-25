import { checkOperationResult } from '../rds-v2-test-utils';

describe('Test result matcher', () => {
  it('should pass without checking typename for non-list response', () => {
    const post = {
      id: '1',
      owner: 'user1',
    };
    const result = {
      data: {
        createPost: {
          ...post,
          __typename: 'Post',
        },
      },
    };

    expect(() => checkOperationResult(result, post, 'createPost')).not.toThrow();
  });

  it('should fail when inputs dont match', () => {
    const post = {
      id: '1',
      owner: 'user1',
    };
    const result = {
      data: {
        createPost: {
          ...post,
          addedField: 'addedField',
          __typename: 'Post',
        },
      },
    };

    expect(() => checkOperationResult(result, post, 'createPost')).toThrow();
  });

  it('should pass without checking typename for list response', () => {
    const post = {
      id: '1',
      owner: 'user1',
    };
    const result = {
      data: {
        listPosts: {
          items: [
            {
              ...post,
              __typename: 'Post',
            },
          ],
        },
      },
    };

    expect(() => checkOperationResult(result, [post], 'listPosts', true)).not.toThrow();
  });

  it('should fail when inputs dont match for list response', () => {
    const post = {
      id: '1',
      owner: 'user1',
    };
    const result = {
      data: {
        listPosts: {
          items: [
            {
              ...post,
              __typename: 'Post',
              addedField: 'addedField',
            },
          ],
        },
      },
    };

    expect(() => checkOperationResult(result, [post], 'listPosts', true)).toThrow();
  });
});
