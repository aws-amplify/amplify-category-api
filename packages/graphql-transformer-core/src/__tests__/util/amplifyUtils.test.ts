import { getS3KeyNamesFromDirectory, getSanityCheckRules, SanityCheckRules } from '../../util/amplifyUtils';
import mock from 'mock-fs';

const buildMockedFeatureFlags = (flagValue: boolean) => {
  return {
    getBoolean: jest.fn(() => flagValue),

    getNumber: jest.fn(),
    getObject: jest.fn(),
  };
};

describe('get sanity check rules', () => {
  test('empty list when api is in create status', () => {
    const sanityCheckRules: SanityCheckRules = getSanityCheckRules(true, buildMockedFeatureFlags(true));
    expect(sanityCheckRules.diffRules.length).toBe(0);
    expect(sanityCheckRules.projectRules.length).toBe(0);
  });

  test('sanitycheck rule list when api is in update status and ff enabled', () => {
    const sanityCheckRules: SanityCheckRules = getSanityCheckRules(false, buildMockedFeatureFlags(true));
    const diffRulesFn = sanityCheckRules.diffRules.map((func) => func.name);
    const projectRulesFn = sanityCheckRules.projectRules.map((func) => func.name);
    expect(diffRulesFn).toMatchSnapshot();
    expect(projectRulesFn).toMatchSnapshot();
  });

  test('sanitycheck rule list when api is in update status and no ff enabled', () => {
    const sanityCheckRules: SanityCheckRules = getSanityCheckRules(false, buildMockedFeatureFlags(false));
    const diffRulesFn = sanityCheckRules.diffRules.map((func) => func.name);
    const projectRulesFn = sanityCheckRules.projectRules.map((func) => func.name);
    expect(diffRulesFn).toMatchSnapshot();
    expect(projectRulesFn).toMatchSnapshot();
  });

  test('sanity check rule list when destructive changes flag is present and ff enabled', () => {
    const sanityCheckRules: SanityCheckRules = getSanityCheckRules(false, buildMockedFeatureFlags(true), true);
    const diffRulesFn = sanityCheckRules.diffRules.map((func) => func.name);
    const projectRulesFn = sanityCheckRules.projectRules.map((func) => func.name);
    expect(diffRulesFn).toMatchSnapshot();
    expect(projectRulesFn).toMatchSnapshot();
  });

  test('sanity check rule list when destructive changes flag is present but ff not enabled', () => {
    const sanityCheckRules: SanityCheckRules = getSanityCheckRules(false, buildMockedFeatureFlags(false), true);
    const diffRulesFn = sanityCheckRules.diffRules.map((func) => func.name);
    const projectRulesFn = sanityCheckRules.projectRules.map((func) => func.name);
    expect(diffRulesFn).toMatchSnapshot();
    expect(projectRulesFn).toMatchSnapshot();
  });
});

describe('get S3 keys from directory', () => {
  const MOCK_ROOT_DIR = 'rootDir';

  afterEach(() => {
    mock.restore();
  });

  it('should have correct S3 keys generated from glob function', () => {
    const mockFilePath = {};
    mockFilePath[MOCK_ROOT_DIR] = {
      a: {
        b: {
          testFile1: 'hello world',
        },
      },
      c: {
        testFile2: 'hello world',
      },
      testFile3: 'hello world',
    };
    mock(mockFilePath);
    const keys = getS3KeyNamesFromDirectory(MOCK_ROOT_DIR);
    expect(keys).toMatchInlineSnapshot(`
      Array [
        "testFile3",
        "c/testFile2",
        "a/b/testFile1",
      ]
    `);
  });
});
