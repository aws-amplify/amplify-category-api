# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.7.0-construct-uses-jsii.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.6.1...@aws-amplify/graphql-construct-alpha@0.7.0-construct-uses-jsii.0) (2023-09-06)

### Bug Fixes

- add all nested deps for construct into deps, bundledDeps, and nohoist ([439fa42](https://github.com/aws-amplify/amplify-category-api/commit/439fa42f60740c14267c70cb56ef1ad397fb115f))
- enable autoDeleteObjects on the codegen bucket ([ba508a6](https://github.com/aws-amplify/amplify-category-api/commit/ba508a608ee1c3dbd5f87e515af8044dea9af951))
- exporting graphql schema, and adding tests ([e49ea68](https://github.com/aws-amplify/amplify-category-api/commit/e49ea68f97460d31e40634087925840aef419224))
- fixing tests, and reverting slight change to output strategy ([524ee39](https://github.com/aws-amplify/amplify-category-api/commit/524ee39c55e58c915e17662d002b06e72b6eeccb))

### Features

- enable jsii builds for the api construct ([6175fdc](https://github.com/aws-amplify/amplify-category-api/commit/6175fdc1d3ee19d99394c38d8b96671a55a388fa))

## [0.6.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.6.0...@aws-amplify/graphql-construct-alpha@0.6.1) (2023-08-30)

**Note:** Version bump only for package @aws-amplify/graphql-construct-alpha

# [0.6.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.5.0...@aws-amplify/graphql-construct-alpha@0.6.0) (2023-08-28)

### Bug Fixes

- don't perform sub if bucketName is an unresolved token ([7750868](https://github.com/aws-amplify/amplify-category-api/commit/7750868b2da660f1b31d6a23c73b7d8543120fd6))

### Features

- add model schema uri to outputs ([b6ce89c](https://github.com/aws-amplify/amplify-category-api/commit/b6ce89c25dffb7f8ede40bd629499b5dca5584f1))
- store api id on stack output ([#1801](https://github.com/aws-amplify/amplify-category-api/issues/1801)) ([cd54115](https://github.com/aws-amplify/amplify-category-api/commit/cd54115786ee12227b01a4adcb323f10a663096a))

# [0.5.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.4.1...@aws-amplify/graphql-construct-alpha@0.5.0) (2023-08-09)

### Bug Fixes

- api export for api construct ([6395d84](https://github.com/aws-amplify/amplify-category-api/commit/6395d849326456c469f7f9da2963807ed06192f3))

### Features

- bump major version of transformer packages ([2458c84](https://github.com/aws-amplify/amplify-category-api/commit/2458c8426da5772aa669d37e11f99ee9c6c5ac2e))
- store construct output ([#1721](https://github.com/aws-amplify/amplify-category-api/issues/1721)) ([472ba66](https://github.com/aws-amplify/amplify-category-api/commit/472ba66d008566d24e5400b92d5a2e0cbb2832a4))

## [0.4.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.4.0...@aws-amplify/graphql-construct-alpha@0.4.1) (2023-07-21)

**Note:** Version bump only for package @aws-amplify/graphql-construct-alpha

# [0.4.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.3.3...@aws-amplify/graphql-construct-alpha@0.4.0) (2023-07-18)

### Features

- support custom preprocessors for different schema shapes ([37a2814](https://github.com/aws-amplify/amplify-category-api/commit/37a28148f1666172e04d2830346bed2fe51ee58e))

## [0.3.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.3.2...@aws-amplify/graphql-construct-alpha@0.3.3) (2023-07-17)

**Note:** Version bump only for package @aws-amplify/graphql-construct-alpha

## [0.3.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.3.1...@aws-amplify/graphql-construct-alpha@0.3.2) (2023-07-07)

**Note:** Version bump only for package @aws-amplify/graphql-construct-alpha

## [0.3.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.3.0...@aws-amplify/graphql-construct-alpha@0.3.1) (2023-07-07)

### Bug Fixes

- trigger republish of dependencies that failed in https://app.circleci.com/pipelines/github/aws-amplify/amplify-category-api/7981/workflows/e7366f04-6f0a-4ee4-9cc2-1772089e8005/jobs/163571 ([f2c7151](https://github.com/aws-amplify/amplify-category-api/commit/f2c7151005e4a9fd29d91ac1af1f3e482a06a5cc))

# [0.3.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.2.0...@aws-amplify/graphql-construct-alpha@0.3.0) (2023-07-07)

### Features

- release alpha cdk construct ([a6dc337](https://github.com/aws-amplify/amplify-category-api/commit/a6dc3377eba66b9acc09b430a2c1239e9127c507))

# 0.2.0 (2023-06-29)

### Bug Fixes

- adding tests, and fixing some bugs, updating api a bit ([4737b9f](https://github.com/aws-amplify/amplify-category-api/commit/4737b9f1aa4fed6abcc5616bfc60d76ba0e60d89))
- update api extract ([56fc360](https://github.com/aws-amplify/amplify-category-api/commit/56fc36017abaaf2f12d7543ea715b35831f37678))

### Features

- add construct method to retrieve generated function slots ([3952f47](https://github.com/aws-amplify/amplify-category-api/commit/3952f478be08b93c87bc88f104cd80e9be5ae7cc))
- add graphql api cdk construct ([681939d](https://github.com/aws-amplify/amplify-category-api/commit/681939d26dab794bd1392fb198994e4a4c6ae00a))

# 0.1.0 (2023-06-20)

### Bug Fixes

- update api extract ([56fc360](https://github.com/aws-amplify/amplify-category-api/commit/56fc36017abaaf2f12d7543ea715b35831f37678))

### Features

- add graphql api cdk construct ([681939d](https://github.com/aws-amplify/amplify-category-api/commit/681939d26dab794bd1392fb198994e4a4c6ae00a))
