/**
 * README
 * This file contains a subset of critical dependency validation rules for the transformer packages.
 * There are certain dependencies we need to be careful of introducing as we refactor the transformers,
 * including access to @aws-amplify/* namespaced packages (namely core, printer),
 * but we also wish to limit imports to `fs`, and a few other particular places.
 */

// List of v2 transformer directories.
const GQL_V2_TRANSFORMER_PACKAGES = [
  'amplify-graphql-auth-transformer',
  'amplify-graphql-default-value-transformer',
  'amplify-graphql-function-transformer',
  'amplify-graphql-http-transformer',
  'amplify-graphql-index-transformer',
  'amplify-graphql-name-mapping-transformer',
  'amplify-graphql-model-transformer',
  'amplify-graphql-predictions-transformer',
  'amplify-graphql-relational-transformer',
  'amplify-graphql-searchable-transformer',
  'amplify-graphql-transformer-core',
  'amplify-graphql-transformer-interfaces',
  'graphql-transformer-common',
  'graphql-mapping-template',
  'amplify-graphql-transformer',
];

const TRANSFORMER_RESTRICTED_IMPORTS = ['fs', 'fs-extra', '@aws-amplify/amplify-cli-core', '@aws-amplify/amplify-prompts'];

module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  env: {
    es6: true,
    node: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
    ecmaFeatures: {
      arrowFunctions: true,
      modules: true,
      module: true,
    },
    project: ['tsconfig.eslint.json', 'tsconfig.base.json'],
  },
  plugins: ['@typescript-eslint', 'spellcheck', 'import', 'jsdoc', 'prefer-arrow'],
  settings: {
    'import/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
    'import/resolver': { typescript: {} },
  },
  ignorePatterns: ['__tests__/**', '*.test.ts', 'lib/**', 'node_modules', '*/node_modules'],
  overrides: [
    {
      files: GQL_V2_TRANSFORMER_PACKAGES.map((packageName) => `packages/${packageName}/src/**`),
      excludedFiles: ['__tests__/**', '*.test.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          ...TRANSFORMER_RESTRICTED_IMPORTS.map((importName) => ({
            name: importName,
            message: `${importName} is not allowed in transformer v2 packages`,
          })),
        ],
      },
    },
  ],
};
