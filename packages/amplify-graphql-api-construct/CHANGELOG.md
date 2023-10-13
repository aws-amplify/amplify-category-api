# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.2.0-amplify-table-preview.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-api-construct@1.2.0-amplify-table-preview.0...@aws-amplify/graphql-api-construct@1.2.0-amplify-table-preview.1) (2023-10-13)

### Bug Fixes

- jsii file ([2b98d69](https://github.com/aws-amplify/amplify-category-api/commit/2b98d69d6ed5b99099653f4efcf25bb64e55c943))

# [1.2.0-amplify-table-preview.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-api-construct@1.1.4...@aws-amplify/graphql-api-construct@1.2.0-amplify-table-preview.0) (2023-10-12)

### Features

- amplify table construct & key schema related transformer changes ([#1903](https://github.com/aws-amplify/amplify-category-api/issues/1903)) ([16cbc64](https://github.com/aws-amplify/amplify-category-api/commit/16cbc64fdfe2bf6e5b725d3c9eafebaeaa613fdc))
- **amplify-table:** add non-GSI update in handler ([#1940](https://github.com/aws-amplify/amplify-category-api/issues/1940)) ([26c4c2d](https://github.com/aws-amplify/amplify-category-api/commit/26c4c2d952b193b20a9abffabe0686385dacfb62))
- bootstrap for adding amplify managed table ([#1849](https://github.com/aws-amplify/amplify-category-api/issues/1849)) ([d7d6740](https://github.com/aws-amplify/amplify-category-api/commit/d7d6740e7bc5291bc42eaefe208c0a5886b8a718))

## [1.1.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-api-construct@1.1.3...@aws-amplify/graphql-api-construct@1.1.4) (2023-10-12)

### Bug Fixes

- optimize codegen asset upload ([9e906d9](https://github.com/aws-amplify/amplify-category-api/commit/9e906d925a415cda52b08dc5725d26f7794e8343))
- speed up codegen asset deployment ([#1933](https://github.com/aws-amplify/amplify-category-api/issues/1933)) ([67cfa6a](https://github.com/aws-amplify/amplify-category-api/commit/67cfa6a95c111e5b53fddcb13b3fbbecad264fcb))
- update readme and docs so they don't get overwritten ([40bc411](https://github.com/aws-amplify/amplify-category-api/commit/40bc41152176541fd885213386463425bc45e28a))

## [1.1.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-api-construct@1.1.2...@aws-amplify/graphql-api-construct@1.1.3) (2023-10-05)

**Note:** Version bump only for package @aws-amplify/graphql-api-construct

## [1.1.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-api-construct@1.1.1...@aws-amplify/graphql-api-construct@1.1.2) (2023-10-03)

### Bug Fixes

- reference api id via context, not hard-coded logical id name ([#1911](https://github.com/aws-amplify/amplify-category-api/issues/1911)) ([538ddc3](https://github.com/aws-amplify/amplify-category-api/commit/538ddc3511c3b667c175e97acd268a85022e4d71))

## [1.1.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-api-construct@1.1.0...@aws-amplify/graphql-api-construct@1.1.1) (2023-10-02)

**Note:** Version bump only for package @aws-amplify/graphql-api-construct

# 1.1.0 (2023-09-28)

### Bug Fixes

- add missing jsdoc for construct constructor ([19463f6](https://github.com/aws-amplify/amplify-category-api/commit/19463f6195c301dcd483890507d4f7bf31dd6376))
- adding tests, and fixing some bugs, updating api a bit ([4737b9f](https://github.com/aws-amplify/amplify-category-api/commit/4737b9f1aa4fed6abcc5616bfc60d76ba0e60d89))
- api export for api construct ([6395d84](https://github.com/aws-amplify/amplify-category-api/commit/6395d849326456c469f7f9da2963807ed06192f3))
- don't perform sub if bucketName is an unresolved token ([7750868](https://github.com/aws-amplify/amplify-category-api/commit/7750868b2da660f1b31d6a23c73b7d8543120fd6))
- enable autoDeleteObjects on the codegen bucket ([ba508a6](https://github.com/aws-amplify/amplify-category-api/commit/ba508a608ee1c3dbd5f87e515af8044dea9af951))
- trigger republish of dependencies that failed in https://app.circleci.com/pipelines/github/aws-amplify/amplify-category-api/7981/workflows/e7366f04-6f0a-4ee4-9cc2-1772089e8005/jobs/163571 ([f2c7151](https://github.com/aws-amplify/amplify-category-api/commit/f2c7151005e4a9fd29d91ac1af1f3e482a06a5cc))
- update api extract ([56fc360](https://github.com/aws-amplify/amplify-category-api/commit/56fc36017abaaf2f12d7543ea715b35831f37678))
- update local deps after release ([d6469f8](https://github.com/aws-amplify/amplify-category-api/commit/d6469f8395506c5812127a9281c17c905a17987a))

### Features

- add amplify metadata to stack description if none is provided ([58266f1](https://github.com/aws-amplify/amplify-category-api/commit/58266f108e47334e39cf5d278499e447e3fbe086))
- add api properties without needing to drop into generated l1 resources ([cb104df](https://github.com/aws-amplify/amplify-category-api/commit/cb104dfb96022a5f811fcdd5bed96f04dbdfb12c))
- add construct method to retrieve generated function slots ([3952f47](https://github.com/aws-amplify/amplify-category-api/commit/3952f478be08b93c87bc88f104cd80e9be5ae7cc))
- add graphql api cdk construct ([681939d](https://github.com/aws-amplify/amplify-category-api/commit/681939d26dab794bd1392fb198994e4a4c6ae00a))
- add model schema uri to outputs ([b6ce89c](https://github.com/aws-amplify/amplify-category-api/commit/b6ce89c25dffb7f8ede40bd629499b5dca5584f1))
- allow adding resolvers, functions, and data sources without leaving l3 ([b0d9746](https://github.com/aws-amplify/amplify-category-api/commit/b0d97465a62db7151e0793e6fbec9da954b48839))
- bump graphql construct to stable/v1 ([#1876](https://github.com/aws-amplify/amplify-category-api/issues/1876)) ([9f66e9c](https://github.com/aws-amplify/amplify-category-api/commit/9f66e9c5610bc47a2ab75775a46135aeca8df990))
- bump major version of transformer packages ([2458c84](https://github.com/aws-amplify/amplify-category-api/commit/2458c8426da5772aa669d37e11f99ee9c6c5ac2e))
- disable amplify cfn outputs for cdk apps ([0c72d18](https://github.com/aws-amplify/amplify-category-api/commit/0c72d1822f8e5ccb3e04a0a49049a459b5fb49e6))
- enable jsii builds for the api construct ([#1840](https://github.com/aws-amplify/amplify-category-api/issues/1840)) ([f6e9aff](https://github.com/aws-amplify/amplify-category-api/commit/f6e9aff2b7e8ad620e1899d29c8cb330b4d6a30f))
- release alpha cdk construct ([a6dc337](https://github.com/aws-amplify/amplify-category-api/commit/a6dc3377eba66b9acc09b430a2c1239e9127c507))
- rename authorizationConfig into authorizationModes, and move adminRoles up ([#1888](https://github.com/aws-amplify/amplify-category-api/issues/1888)) ([7148814](https://github.com/aws-amplify/amplify-category-api/commit/714881476a962cb0f681bc68a7f309fe43e97a60))
- store api id on stack output ([#1801](https://github.com/aws-amplify/amplify-category-api/issues/1801)) ([cd54115](https://github.com/aws-amplify/amplify-category-api/commit/cd54115786ee12227b01a4adcb323f10a663096a))
- store construct output ([#1721](https://github.com/aws-amplify/amplify-category-api/issues/1721)) ([472ba66](https://github.com/aws-amplify/amplify-category-api/commit/472ba66d008566d24e5400b92d5a2e0cbb2832a4))
- support custom preprocessors for different schema shapes ([37a2814](https://github.com/aws-amplify/amplify-category-api/commit/37a28148f1666172e04d2830346bed2fe51ee58e))

# [0.9.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.8.0...@aws-amplify/graphql-construct-alpha@0.9.0) (2023-09-27)

### Bug Fixes

- add missing jsdoc for construct constructor ([19463f6](https://github.com/aws-amplify/amplify-category-api/commit/19463f6195c301dcd483890507d4f7bf31dd6376))

### Features

- add api properties without needing to drop into generated l1 resources ([cb104df](https://github.com/aws-amplify/amplify-category-api/commit/cb104dfb96022a5f811fcdd5bed96f04dbdfb12c))
- allow adding resolvers, functions, and data sources without leaving l3 ([b0d9746](https://github.com/aws-amplify/amplify-category-api/commit/b0d97465a62db7151e0793e6fbec9da954b48839))
- rename authorizationConfig into authorizationModes, and move adminRoles up ([#1888](https://github.com/aws-amplify/amplify-category-api/issues/1888)) ([7148814](https://github.com/aws-amplify/amplify-category-api/commit/714881476a962cb0f681bc68a7f309fe43e97a60))

# [0.8.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.7.1...@aws-amplify/graphql-construct-alpha@0.8.0) (2023-09-20)

### Features

- add amplify metadata to stack description if none is provided ([58266f1](https://github.com/aws-amplify/amplify-category-api/commit/58266f108e47334e39cf5d278499e447e3fbe086))
- disable amplify cfn outputs for cdk apps ([0c72d18](https://github.com/aws-amplify/amplify-category-api/commit/0c72d1822f8e5ccb3e04a0a49049a459b5fb49e6))

## [0.7.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.7.0...@aws-amplify/graphql-construct-alpha@0.7.1) (2023-09-14)

**Note:** Version bump only for package @aws-amplify/graphql-construct-alpha

# [0.7.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.6.2...@aws-amplify/graphql-construct-alpha@0.7.0) (2023-09-13)

### Bug Fixes

- update local deps after release ([d6469f8](https://github.com/aws-amplify/amplify-category-api/commit/d6469f8395506c5812127a9281c17c905a17987a))

### Features

- enable jsii builds for the api construct ([#1840](https://github.com/aws-amplify/amplify-category-api/issues/1840)) ([f6e9aff](https://github.com/aws-amplify/amplify-category-api/commit/f6e9aff2b7e8ad620e1899d29c8cb330b4d6a30f))

## [0.6.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-construct-alpha@0.6.1...@aws-amplify/graphql-construct-alpha@0.6.2) (2023-09-07)

### Bug Fixes

- enable autoDeleteObjects on the codegen bucket ([ba508a6](https://github.com/aws-amplify/amplify-category-api/commit/ba508a608ee1c3dbd5f87e515af8044dea9af951))

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
