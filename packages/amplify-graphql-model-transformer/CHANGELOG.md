# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.11.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.11.1...@aws-amplify/graphql-model-transformer@2.11.2) (2024-07-15)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [2.11.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.11.0...@aws-amplify/graphql-model-transformer@2.11.1) (2024-07-02)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [2.11.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.10.2...@aws-amplify/graphql-model-transformer@2.11.0) (2024-07-01)

### Bug Fixes

- auth to use validateUsingSource in place of auth filter to show error message ([#2523](https://github.com/aws-amplify/amplify-category-api/issues/2523)) ([b7d83f9](https://github.com/aws-amplify/amplify-category-api/commit/b7d83f991f85eaffb2408cff98e1880c7fa680ef))

### Features

- support custom SSL certs in SQL lambda handler ([#2631](https://github.com/aws-amplify/amplify-category-api/issues/2631)) ([f444517](https://github.com/aws-amplify/amplify-category-api/commit/f444517f2deebdb16dcc16257ed083ead4af9c9b))

## [2.10.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.10.1...@aws-amplify/graphql-model-transformer@2.10.2) (2024-06-25)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [2.10.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.10.0...@aws-amplify/graphql-model-transformer@2.10.1) (2024-05-15)

### Bug Fixes

- **api:** handle attribute type change on gsi ([#2542](https://github.com/aws-amplify/amplify-category-api/issues/2542)) ([f0a4709](https://github.com/aws-amplify/amplify-category-api/commit/f0a470990dd41966f802bb6ecb7b7ffa41a5c7d5))

# [2.10.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.9.1...@aws-amplify/graphql-model-transformer@2.10.0) (2024-05-10)

### Features

- add tag to SQL datasource function ([#2511](https://github.com/aws-amplify/amplify-category-api/issues/2511)) ([d64fc1e](https://github.com/aws-amplify/amplify-category-api/commit/d64fc1e4d19c923cf985e30e26ce95c565a8839b))

## [2.9.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.9.0...@aws-amplify/graphql-model-transformer@2.9.1) (2024-05-01)

### Bug Fixes

- **graphql-relational-transformer:** nullability enforcement for references relational fields ([#2510](https://github.com/aws-amplify/amplify-category-api/issues/2510)) ([d540097](https://github.com/aws-amplify/amplify-category-api/commit/d54009736092410b2d6e78ebf116a38298bf03ce))
- set installLatestAwsSdk on AwsCustomResource to false ([#2509](https://github.com/aws-amplify/amplify-category-api/issues/2509)) ([53665c0](https://github.com/aws-amplify/amplify-category-api/commit/53665c05122ce2339c8c5358b9b6b57395e4de87))

### Performance Improvements

- **graphql-model-transformer:** minimal provider framework and inline policies ([#2490](https://github.com/aws-amplify/amplify-category-api/issues/2490)) ([a86c816](https://github.com/aws-amplify/amplify-category-api/commit/a86c816ceb288376c4dfa9b1d12413edd28cf75e))

# [2.9.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.8.0...@aws-amplify/graphql-model-transformer@2.9.0) (2024-04-26)

### Bug Fixes

- add non-scalar and array fields to SQL relations ([#2501](https://github.com/aws-amplify/amplify-category-api/issues/2501)) ([511f020](https://github.com/aws-amplify/amplify-category-api/commit/511f0202583e3e2110a2c22f3bfd24845ea038c0))
- auto generated id when timestamps: null ([#2470](https://github.com/aws-amplify/amplify-category-api/issues/2470)) ([936a4f9](https://github.com/aws-amplify/amplify-category-api/commit/936a4f9b40ae21a7bd4250616c8d83835bb75784))

### Features

- generic iam authorization ([#2385](https://github.com/aws-amplify/amplify-category-api/issues/2385)) ([550ee80](https://github.com/aws-amplify/amplify-category-api/commit/550ee803275817d25447ff1400d55eb1ad4cd0c2))
- support multiple connection Uris for SQL databases ([#2481](https://github.com/aws-amplify/amplify-category-api/issues/2481)) ([7ea8000](https://github.com/aws-amplify/amplify-category-api/commit/7ea8000026d3f8fe9c791720701250fa958c9bc8))

# [2.8.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.7.0...@aws-amplify/graphql-model-transformer@2.8.0) (2024-04-11)

### Bug Fixes

- **amplify-table:** describe ttl rate limit ([#2410](https://github.com/aws-amplify/amplify-category-api/issues/2410)) ([0d2ea6a](https://github.com/aws-amplify/amplify-category-api/commit/0d2ea6a85497e75886cabcdb0f0246d1e562f1c3))
- remove null timestamp fields from filter input ([#2435](https://github.com/aws-amplify/amplify-category-api/issues/2435)) ([045ece2](https://github.com/aws-amplify/amplify-category-api/commit/045ece2ed41a34baa5e6c5ed0c2b9ec8fddaf5f1))

### Features

- add cdk sql connection string support ([#2409](https://github.com/aws-amplify/amplify-category-api/issues/2409)) ([274d117](https://github.com/aws-amplify/amplify-category-api/commit/274d1176d96e265d02817a975848c767d6d43c31))
- Fetch SNS topic ARN from SQL manifest ([#2345](https://github.com/aws-amplify/amplify-category-api/issues/2345)) ([fca256e](https://github.com/aws-amplify/amplify-category-api/commit/fca256e7cabf5af838b28b26c4ae0c3c8b1583eb))

# [2.7.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.6.0...@aws-amplify/graphql-model-transformer@2.7.0) (2024-03-28)

### Features

- add secrets manager as credential store for sql lambda ([#2289](https://github.com/aws-amplify/amplify-category-api/issues/2289)) ([affdb98](https://github.com/aws-amplify/amplify-category-api/commit/affdb988b499591c3a96608f772b637ddd8c3a0c))

# [2.6.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.5.0...@aws-amplify/graphql-model-transformer@2.6.0) (2024-03-13)

### Features

- expose table representative & access refactor for amplify managed table in api construct ([8777cd1](https://github.com/aws-amplify/amplify-category-api/commit/8777cd1d9609ef4d85c5ea3c95b249cc13ade6e4))

# [2.5.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.4.5...@aws-amplify/graphql-model-transformer@2.5.0) (2024-02-28)

### Features

- add implicit fields to filter input ([#2236](https://github.com/aws-amplify/amplify-category-api/issues/2236)) ([f7ec601](https://github.com/aws-amplify/amplify-category-api/commit/f7ec6014d4eecfede186129a6ea19041780bafb3))

## [2.4.5](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.4.4...@aws-amplify/graphql-model-transformer@2.4.5) (2024-02-05)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [2.4.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.4.3...@aws-amplify/graphql-model-transformer@2.4.4) (2024-01-30)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [2.4.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.4.2...@aws-amplify/graphql-model-transformer@2.4.3) (2024-01-22)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [2.4.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.4.1...@aws-amplify/graphql-model-transformer@2.4.2) (2023-12-18)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [2.4.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.4.0...@aws-amplify/graphql-model-transformer@2.4.1) (2023-12-14)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [2.4.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.3.3...@aws-amplify/graphql-model-transformer@2.4.0) (2023-12-06)

### Features

- combine heterogeneous data sources ([#2109](https://github.com/aws-amplify/amplify-category-api/issues/2109)) ([fd58bb5](https://github.com/aws-amplify/amplify-category-api/commit/fd58bb5af4249220d17c9751acf677955aed74ea))
- Support custom SQL across definitions ([#2115](https://github.com/aws-amplify/amplify-category-api/issues/2115)) ([eab4820](https://github.com/aws-amplify/amplify-category-api/commit/eab4820c1c931fbdf804b2315b63773a376e0822))

## [2.3.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.3.2...@aws-amplify/graphql-model-transformer@2.3.3) (2023-11-22)

### Bug Fixes

- Allow custom SQL statements without model declarations ([#2087](https://github.com/aws-amplify/amplify-category-api/issues/2087)) ([ea5b26c](https://github.com/aws-amplify/amplify-category-api/commit/ea5b26cd554f5c74b6431cbad6ccf60ab556478f))

## [2.3.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.3.1...@aws-amplify/graphql-model-transformer@2.3.2) (2023-11-18)

### Bug Fixes

- regionalize lambda layer patching SNS topics ([#2079](https://github.com/aws-amplify/amplify-category-api/issues/2079)) ([6006c86](https://github.com/aws-amplify/amplify-category-api/commit/6006c86cd4ee624b24c184fab523fcdcdb38be63))

## [2.3.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.3.0...@aws-amplify/graphql-model-transformer@2.3.1) (2023-11-16)

### Bug Fixes

- Rename VPC Endpoint CDK prefix ([#2072](https://github.com/aws-amplify/amplify-category-api/issues/2072)) ([00824c1](https://github.com/aws-amplify/amplify-category-api/commit/00824c137a07fd04d325e02465ca6be3805f78c2))

# [2.3.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.2.4...@aws-amplify/graphql-model-transformer@2.3.0) (2023-11-15)

### Bug Fixes

- address managed table QA feedbacks ([#2059](https://github.com/aws-amplify/amplify-category-api/issues/2059)) ([82a5cd6](https://github.com/aws-amplify/amplify-category-api/commit/82a5cd677fdf183e81590d120a8f494a2ff611ec))
- **api:** make id optional if not a string type ([48ecac0](https://github.com/aws-amplify/amplify-category-api/commit/48ecac0989097106a531ebb898abbda7a0f1745c))
- Change 'rds' to 'sql' in public-facing symbols ([#2069](https://github.com/aws-amplify/amplify-category-api/issues/2069)) ([ff374dd](https://github.com/aws-amplify/amplify-category-api/commit/ff374dd8398d3f1138a31669b1a5962122039437))

### Features

- add debug mode env variable ([0d2f177](https://github.com/aws-amplify/amplify-category-api/commit/0d2f17775a88e505469c8d2fcf9b6487d89a4a4a))
- add managed table support in API construct ([#2024](https://github.com/aws-amplify/amplify-category-api/issues/2024)) ([96a0d94](https://github.com/aws-amplify/amplify-category-api/commit/96a0d94fa872a5329da120f53be139833449b815)), closes [#1849](https://github.com/aws-amplify/amplify-category-api/issues/1849) [#1903](https://github.com/aws-amplify/amplify-category-api/issues/1903) [#1940](https://github.com/aws-amplify/amplify-category-api/issues/1940) [#1971](https://github.com/aws-amplify/amplify-category-api/issues/1971) [#1973](https://github.com/aws-amplify/amplify-category-api/issues/1973)
- add postgres engine and update types as needed ([#1979](https://github.com/aws-amplify/amplify-category-api/issues/1979)) ([5257d53](https://github.com/aws-amplify/amplify-category-api/commit/5257d53f1d4d02be71b34ddf6757f22dd5d74aff))
- add refersTo directive transformer for model renaming ([#1830](https://github.com/aws-amplify/amplify-category-api/issues/1830)) ([afbd6f2](https://github.com/aws-amplify/amplify-category-api/commit/afbd6f282bc411313ce098a53a87bb8c6481aa48))
- Add SQL database support to AmplifyGraphqlApi construct ([#1986](https://github.com/aws-amplify/amplify-category-api/issues/1986)) ([2ff63a5](https://github.com/aws-amplify/amplify-category-api/commit/2ff63a540387d96cf10d8ae1975858a76d9ba045)), closes [#1917](https://github.com/aws-amplify/amplify-category-api/issues/1917) [#1983](https://github.com/aws-amplify/amplify-category-api/issues/1983)
- **api:** add arrays and objects support for rds datasource ([cbfb017](https://github.com/aws-amplify/amplify-category-api/commit/cbfb017029e45c6e7cb8fea4250794d02afff4ca))
- **api:** add vpc endpoints for ssm ([5a4ffc4](https://github.com/aws-amplify/amplify-category-api/commit/5a4ffc4c1889536c8e1fdd1f31fe28ca4326100f))
- **api:** custom queries support using sql directive ([5214037](https://github.com/aws-amplify/amplify-category-api/commit/52140374ca974956c5d5eac09fec91a51cfc9027))
- **api:** rds auth model level rules ([d2b0217](https://github.com/aws-amplify/amplify-category-api/commit/d2b0217b9c0ba11c60441720c0fd31802b64de39))
- refersTo supports field name mappings on RDS models ([#1865](https://github.com/aws-amplify/amplify-category-api/issues/1865)) ([ee60011](https://github.com/aws-amplify/amplify-category-api/commit/ee60011f5c41d0442e1096dd16d80e94b900745a))
- sql lambda provisioned concurrency ([#2055](https://github.com/aws-amplify/amplify-category-api/issues/2055)) ([d8c5bf0](https://github.com/aws-amplify/amplify-category-api/commit/d8c5bf0b7df3cdd1ad499380d24fe49a61acbc7e))
- transformer behavior of replacing table upon gsi updates ([#2067](https://github.com/aws-amplify/amplify-category-api/issues/2067)) ([c4b7530](https://github.com/aws-amplify/amplify-category-api/commit/c4b7530e0880b34d411fc2732fa199e4a28bcea1))

## [2.2.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.2.3...@aws-amplify/graphql-model-transformer@2.2.4) (2023-11-02)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [2.2.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.2.2...@aws-amplify/graphql-model-transformer@2.2.3) (2023-10-12)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [2.2.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.2.1...@aws-amplify/graphql-model-transformer@2.2.2) (2023-10-05)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [2.2.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.2.0...@aws-amplify/graphql-model-transformer@2.2.1) (2023-10-02)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [2.2.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.1.3...@aws-amplify/graphql-model-transformer@2.2.0) (2023-09-20)

### Features

- disable amplify cfn outputs for cdk apps ([0c72d18](https://github.com/aws-amplify/amplify-category-api/commit/0c72d1822f8e5ccb3e04a0a49049a459b5fb49e6))

## [2.1.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.1.2...@aws-amplify/graphql-model-transformer@2.1.3) (2023-09-07)

### Bug Fixes

- npm publish ignore tests and lambdas sources ([e1411cd](https://github.com/aws-amplify/amplify-category-api/commit/e1411cdd5e34cefa6b2fc08fcf49aab4c0afc727))

## [2.1.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.1.1...@aws-amplify/graphql-model-transformer@2.1.2) (2023-08-30)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [2.1.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@2.1.0...@aws-amplify/graphql-model-transformer@2.1.1) (2023-08-28)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [2.1.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.4.0...@aws-amplify/graphql-model-transformer@2.1.0) (2023-08-09)

### Features

- bump major version of transformer packages ([2458c84](https://github.com/aws-amplify/amplify-category-api/commit/2458c8426da5772aa669d37e11f99ee9c6c5ac2e))

# [1.4.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.3.8...@aws-amplify/graphql-model-transformer@1.4.0) (2023-07-21)

### Bug Fixes

- **api:** add delay to rds patching ([3785b8e](https://github.com/aws-amplify/amplify-category-api/commit/3785b8e1ad22716c89e9ffdc375ae13a081c30c9))

### Features

- **graphql:** patching rds lambda layer ([a751fcb](https://github.com/aws-amplify/amplify-category-api/commit/a751fcbe75daf1fd8a1ce37b97379ad6ca3d6cec))
- **graphql:** pull rds latest layer ([8325ef5](https://github.com/aws-amplify/amplify-category-api/commit/8325ef559b4bd5d86e9502bb1dc2cff833e7db0c))
- **graphql:** vpc support for sql lambda ([9cc4407](https://github.com/aws-amplify/amplify-category-api/commit/9cc4407bdc4799fe548919808961911a3d5995c7))

## [1.3.8](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.3.7...@aws-amplify/graphql-model-transformer@1.3.8) (2023-07-17)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [1.3.7](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.3.6...@aws-amplify/graphql-model-transformer@1.3.7) (2023-07-07)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [1.3.6](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.3.5...@aws-amplify/graphql-model-transformer@1.3.6) (2023-07-07)

### Bug Fixes

- trigger republish of dependencies that failed in https://app.circleci.com/pipelines/github/aws-amplify/amplify-category-api/7981/workflows/e7366f04-6f0a-4ee4-9cc2-1772089e8005/jobs/163571 ([f2c7151](https://github.com/aws-amplify/amplify-category-api/commit/f2c7151005e4a9fd29d91ac1af1f3e482a06a5cc))

## [1.3.5](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.3.4...@aws-amplify/graphql-model-transformer@1.3.5) (2023-07-07)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [1.3.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.3.3...@aws-amplify/graphql-model-transformer@1.3.4) (2023-06-29)

### Bug Fixes

- handling of all floating promises ([#1577](https://github.com/aws-amplify/amplify-category-api/issues/1577)) ([d5981b2](https://github.com/aws-amplify/amplify-category-api/commit/d5981b2f912d03b44e1269ca704816dd250ff501))
- use addDependency instead of addDependsOn ([7fd1333](https://github.com/aws-amplify/amplify-category-api/commit/7fd13336732159ba560020e92eff90a9fc179098))

## [1.3.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.3.2...@aws-amplify/graphql-model-transformer@1.3.3) (2023-06-20)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [1.3.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.3.1...@aws-amplify/graphql-model-transformer@1.3.2) (2023-06-05)

### Bug Fixes

- **graphql:** renamed subscription should generate auth resolver ([bbf3998](https://github.com/aws-amplify/amplify-category-api/commit/bbf399888d65e0e08020da622722d93670bc742c))

## [1.3.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.3.0...@aws-amplify/graphql-model-transformer@1.3.1) (2023-05-23)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [1.3.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.2.1...@aws-amplify/graphql-model-transformer@1.3.0) (2023-05-17)

### Bug Fixes

- **auth:** ownerfield as pk in relational models ([#1389](https://github.com/aws-amplify/amplify-category-api/issues/1389)) ([20a38bd](https://github.com/aws-amplify/amplify-category-api/commit/20a38bd20d315a67280482a7dea5418dd9b0e4af))
- **graphql:** import rds errors due to primary key and index ([dbb8efe](https://github.com/aws-amplify/amplify-category-api/commit/dbb8efe89a9dbc60c4f3b975117a0481ad9475de))
- **graphql:** index rds query ([73389da](https://github.com/aws-amplify/amplify-category-api/commit/73389da088e794f89b5c649342ee680cbbb441c9))
- **graphql:** make ids on nested non-model types required ([#1429](https://github.com/aws-amplify/amplify-category-api/issues/1429)) ([219884d](https://github.com/aws-amplify/amplify-category-api/commit/219884d691accfdf4b8676ae8adc4cb55c310df3))
- PR feedback, windows build fix ([5a3f9cc](https://github.com/aws-amplify/amplify-category-api/commit/5a3f9cc09b6f63cd3520e5fd200d26ea3e4b7503))
- rds v2 e2e tests ([f0f344d](https://github.com/aws-amplify/amplify-category-api/commit/f0f344d7034ab1fa4cdeb4a97429b2705d622848))
- update lambda to get db details from ssm ([4e3d10b](https://github.com/aws-amplify/amplify-category-api/commit/4e3d10bce43d17e2f489df4c40a09d9e5b7e315b))

### Features

- add RDS primary key transformer ([b6cd813](https://github.com/aws-amplify/amplify-category-api/commit/b6cd813dcc36843c0a5686133e8af1600cd1badb))
- **datastore-filters:** add filters for DataStore \_deleted property ([9812083](https://github.com/aws-amplify/amplify-category-api/commit/9812083cf6dd39b21d95241b2b637e62ea11083d))

## [1.2.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.2.0...@aws-amplify/graphql-model-transformer@1.2.1) (2023-04-25)

### Bug Fixes

- **auth:** ownerfield as pk in relational models ([#1389](https://github.com/aws-amplify/amplify-category-api/issues/1389)) ([9b636f7](https://github.com/aws-amplify/amplify-category-api/commit/9b636f71ebef453ea008d828aa8f53ffaff48f8e))

# [1.2.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.1.1...@aws-amplify/graphql-model-transformer@1.2.0) (2023-03-30)

### Features

- inject project info into api overrides ([#1372](https://github.com/aws-amplify/amplify-category-api/issues/1372)) ([2b92351](https://github.com/aws-amplify/amplify-category-api/commit/2b92351c95a5c820e0e758e69226c08f4355d472))

## [1.1.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.1.0...@aws-amplify/graphql-model-transformer@1.1.1) (2023-03-15)

### Bug Fixes

- cascaded embeddable type input is respected by the GraphQL Model Transformer ([bd34a3f](https://github.com/aws-amplify/amplify-category-api/commit/bd34a3f629b0bf144655e6d79246f0166e485773))

# [1.1.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.9...@aws-amplify/graphql-model-transformer@1.1.0) (2023-03-01)

### Bug Fixes

- error in transformers if override has never been setup ([#1270](https://github.com/aws-amplify/amplify-category-api/issues/1270)) ([bba14c3](https://github.com/aws-amplify/amplify-category-api/commit/bba14c349bb840d911572acc79438c428b4f95cd))
- lock CDK v2 version ([#923](https://github.com/aws-amplify/amplify-category-api/issues/923)) ([2afe40c](https://github.com/aws-amplify/amplify-category-api/commit/2afe40cf13e7d1ee7db37988b9b3297768c7bd0a))
- preserve logical id patterns for dynamodb tables and search domain ([#894](https://github.com/aws-amplify/amplify-category-api/issues/894)) ([7530fc2](https://github.com/aws-amplify/amplify-category-api/commit/7530fc2e9254b621dc3782271318dd3f5c97d2b8))

### Features

- migrate index and model transformers to CDK v2 ([#860](https://github.com/aws-amplify/amplify-category-api/issues/860)) ([886ab6c](https://github.com/aws-amplify/amplify-category-api/commit/886ab6c1eb699f9a09f273c76b3c419c73004f9b))

# [1.1.0-beta.6](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.8...@aws-amplify/graphql-model-transformer@1.1.0-beta.6) (2023-02-21)

### Bug Fixes

- error in transformers if override has never been setup ([#1270](https://github.com/aws-amplify/amplify-category-api/issues/1270)) ([bba14c3](https://github.com/aws-amplify/amplify-category-api/commit/bba14c349bb840d911572acc79438c428b4f95cd))
- lock CDK v2 version ([#923](https://github.com/aws-amplify/amplify-category-api/issues/923)) ([2afe40c](https://github.com/aws-amplify/amplify-category-api/commit/2afe40cf13e7d1ee7db37988b9b3297768c7bd0a))
- preserve logical id patterns for dynamodb tables and search domain ([#894](https://github.com/aws-amplify/amplify-category-api/issues/894)) ([7530fc2](https://github.com/aws-amplify/amplify-category-api/commit/7530fc2e9254b621dc3782271318dd3f5c97d2b8))

### Features

- migrate index and model transformers to CDK v2 ([#860](https://github.com/aws-amplify/amplify-category-api/issues/860)) ([886ab6c](https://github.com/aws-amplify/amplify-category-api/commit/886ab6c1eb699f9a09f273c76b3c419c73004f9b))

# [1.1.0-beta.5](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.8...@aws-amplify/graphql-model-transformer@1.1.0-beta.5) (2023-02-15)

### Bug Fixes

- lock CDK v2 version ([#923](https://github.com/aws-amplify/amplify-category-api/issues/923)) ([2afe40c](https://github.com/aws-amplify/amplify-category-api/commit/2afe40cf13e7d1ee7db37988b9b3297768c7bd0a))
- preserve logical id patterns for dynamodb tables and search domain ([#894](https://github.com/aws-amplify/amplify-category-api/issues/894)) ([7530fc2](https://github.com/aws-amplify/amplify-category-api/commit/7530fc2e9254b621dc3782271318dd3f5c97d2b8))

### Features

- migrate index and model transformers to CDK v2 ([#860](https://github.com/aws-amplify/amplify-category-api/issues/860)) ([886ab6c](https://github.com/aws-amplify/amplify-category-api/commit/886ab6c1eb699f9a09f273c76b3c419c73004f9b))

# [1.1.0-beta.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.7...@aws-amplify/graphql-model-transformer@1.1.0-beta.4) (2023-02-03)

### Bug Fixes

- lock CDK v2 version ([#923](https://github.com/aws-amplify/amplify-category-api/issues/923)) ([2afe40c](https://github.com/aws-amplify/amplify-category-api/commit/2afe40cf13e7d1ee7db37988b9b3297768c7bd0a))
- preserve logical id patterns for dynamodb tables and search domain ([#894](https://github.com/aws-amplify/amplify-category-api/issues/894)) ([7530fc2](https://github.com/aws-amplify/amplify-category-api/commit/7530fc2e9254b621dc3782271318dd3f5c97d2b8))

### Features

- migrate index and model transformers to CDK v2 ([#860](https://github.com/aws-amplify/amplify-category-api/issues/860)) ([886ab6c](https://github.com/aws-amplify/amplify-category-api/commit/886ab6c1eb699f9a09f273c76b3c419c73004f9b))

# [1.1.0-beta.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.4...@aws-amplify/graphql-model-transformer@1.1.0-beta.3) (2022-12-27)

### Bug Fixes

- lock CDK v2 version ([#923](https://github.com/aws-amplify/amplify-category-api/issues/923)) ([2afe40c](https://github.com/aws-amplify/amplify-category-api/commit/2afe40cf13e7d1ee7db37988b9b3297768c7bd0a))
- preserve logical id patterns for dynamodb tables and search domain ([#894](https://github.com/aws-amplify/amplify-category-api/issues/894)) ([7530fc2](https://github.com/aws-amplify/amplify-category-api/commit/7530fc2e9254b621dc3782271318dd3f5c97d2b8))

### Features

- migrate index and model transformers to CDK v2 ([#860](https://github.com/aws-amplify/amplify-category-api/issues/860)) ([886ab6c](https://github.com/aws-amplify/amplify-category-api/commit/886ab6c1eb699f9a09f273c76b3c419c73004f9b))

# [1.1.0-beta.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.1.0-beta.0...@aws-amplify/graphql-model-transformer@1.1.0-beta.2) (2022-12-12)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [1.1.0-beta.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.1.0-beta.0...@aws-amplify/graphql-model-transformer@1.1.0-beta.1) (2022-11-30)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [1.1.0-beta.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.1.0-cdkv2.2...@aws-amplify/graphql-model-transformer@1.1.0-beta.0) (2022-11-18)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [1.1.0-cdkv2.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.3...@aws-amplify/graphql-model-transformer@1.1.0-cdkv2.2) (2022-11-15)

### Bug Fixes

- lock CDK v2 version ([#923](https://github.com/aws-amplify/amplify-category-api/issues/923)) ([2afe40c](https://github.com/aws-amplify/amplify-category-api/commit/2afe40cf13e7d1ee7db37988b9b3297768c7bd0a))
- preserve logical id patterns for dynamodb tables and search domain ([#894](https://github.com/aws-amplify/amplify-category-api/issues/894)) ([7530fc2](https://github.com/aws-amplify/amplify-category-api/commit/7530fc2e9254b621dc3782271318dd3f5c97d2b8))

### Features

- migrate index and model transformers to CDK v2 ([#860](https://github.com/aws-amplify/amplify-category-api/issues/860)) ([886ab6c](https://github.com/aws-amplify/amplify-category-api/commit/886ab6c1eb699f9a09f273c76b3c419c73004f9b))

# [1.1.0-cdkv2.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@1.1.0-cdkv2.0...@aws-amplify/graphql-model-transformer@1.1.0-cdkv2.1) (2022-10-24)

### Bug Fixes

- lock CDK v2 version ([#923](https://github.com/aws-amplify/amplify-category-api/issues/923)) ([2afe40c](https://github.com/aws-amplify/amplify-category-api/commit/2afe40cf13e7d1ee7db37988b9b3297768c7bd0a))

# [1.1.0-cdkv2.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.0...@aws-amplify/graphql-model-transformer@1.1.0-cdkv2.0) (2022-10-24)

### Bug Fixes

- preserve logical id patterns for dynamodb tables and search domain ([#894](https://github.com/aws-amplify/amplify-category-api/issues/894)) ([7530fc2](https://github.com/aws-amplify/amplify-category-api/commit/7530fc2e9254b621dc3782271318dd3f5c97d2b8))

### Features

- migrate index and model transformers to CDK v2 ([#860](https://github.com/aws-amplify/amplify-category-api/issues/860)) ([886ab6c](https://github.com/aws-amplify/amplify-category-api/commit/886ab6c1eb699f9a09f273c76b3c419c73004f9b))

## [0.16.9](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.8...@aws-amplify/graphql-model-transformer@0.16.9) (2023-02-27)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.16.8](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.7...@aws-amplify/graphql-model-transformer@0.16.8) (2023-02-10)

### Bug Fixes

- **transformer:** conflict detection respects to per model rule ([#1201](https://github.com/aws-amplify/amplify-category-api/issues/1201)) ([9fd7e16](https://github.com/aws-amplify/amplify-category-api/commit/9fd7e166c78c265c704653213adce47a5c8a55f7))

## [0.16.7](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.6...@aws-amplify/graphql-model-transformer@0.16.7) (2023-01-26)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.16.6](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.5...@aws-amplify/graphql-model-transformer@0.16.6) (2023-01-12)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.16.5](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.4...@aws-amplify/graphql-model-transformer@0.16.5) (2023-01-12)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.16.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.3...@aws-amplify/graphql-model-transformer@0.16.4) (2022-12-03)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.16.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.2...@aws-amplify/graphql-model-transformer@0.16.3) (2022-11-08)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.16.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.1...@aws-amplify/graphql-model-transformer@0.16.2) (2022-10-26)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.16.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.16.0...@aws-amplify/graphql-model-transformer@0.16.1) (2022-10-24)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [0.16.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.15.7...@aws-amplify/graphql-model-transformer@0.16.0) (2022-10-04)

### Features

- **graphql:** subscriptions rtf support ([#837](https://github.com/aws-amplify/amplify-category-api/issues/837)) ([99caa22](https://github.com/aws-amplify/amplify-category-api/commit/99caa22d4d48c317ce98bdc7ae7f19d7e3c0ce94))

## [0.15.7](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.15.6...@aws-amplify/graphql-model-transformer@0.15.7) (2022-09-14)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.15.6](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.15.5...@aws-amplify/graphql-model-transformer@0.15.6) (2022-08-23)

### Reverts

- Revert "Undo change to directive merge that broke tests" (#756) ([3da2ce6](https://github.com/aws-amplify/amplify-category-api/commit/3da2ce604469d87160de1374f944a891ca9f476b)), closes [#756](https://github.com/aws-amplify/amplify-category-api/issues/756)

## [0.15.5](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.15.4...@aws-amplify/graphql-model-transformer@0.15.5) (2022-08-16)

### Bug Fixes

- set cfn values correctly when applying lambda-based conflict resolution ([4542759](https://github.com/aws-amplify/amplify-category-api/commit/45427596bbcfcb83bda18a037b0b540bff812b25))

## [0.15.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.15.3...@aws-amplify/graphql-model-transformer@0.15.4) (2022-08-04)

### Bug Fixes

- **graphql:** revert subscriptions server-side filtering ([20cffc0](https://github.com/aws-amplify/amplify-category-api/commit/20cffc0810c23f85127a939c0a3b812f87c2a601))

## [0.15.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.15.2...@aws-amplify/graphql-model-transformer@0.15.3) (2022-07-26)

### Bug Fixes

- **graphql:** incorrect filter expression on model transformer ([#697](https://github.com/aws-amplify/amplify-category-api/issues/697)) ([a6fc3be](https://github.com/aws-amplify/amplify-category-api/commit/a6fc3beb6746bad8fcca55bb85b6615dee7318c8))

## [0.15.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.15.0...@aws-amplify/graphql-model-transformer@0.15.2) (2022-07-20)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.15.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.15.0...@aws-amplify/graphql-model-transformer@0.15.1) (2022-07-14)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [0.15.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.14.6...@aws-amplify/graphql-model-transformer@0.15.0) (2022-07-01)

### Features

- **graphql:** add runtime filtering support for subscriptions ([#551](https://github.com/aws-amplify/amplify-category-api/issues/551)) ([0a24bb0](https://github.com/aws-amplify/amplify-category-api/commit/0a24bb0444ecc0947218db41094ab4ef4f0e2948))

## [0.14.6](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.14.5...@aws-amplify/graphql-model-transformer@0.14.6) (2022-06-23)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.14.5](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.14.4...@aws-amplify/graphql-model-transformer@0.14.5) (2022-06-13)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.14.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.14.3...@aws-amplify/graphql-model-transformer@0.14.4) (2022-06-10)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.14.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.14.0...@aws-amplify/graphql-model-transformer@0.14.3) (2022-06-07)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.14.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-model-transformer@0.14.0...@aws-amplify/graphql-model-transformer@0.14.2) (2022-05-31)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.14.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.14.0...@aws-amplify/graphql-model-transformer@0.14.1) (2022-05-02)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [0.14.0](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.13.6...@aws-amplify/graphql-model-transformer@0.14.0) (2022-04-29)

### Features

- dedup appsync functions ([#10289](https://github.com/aws-amplify/amplify-cli/issues/10289)) ([1a5607c](https://github.com/aws-amplify/amplify-cli/commit/1a5607c3e40d3a8144fc5f66a1632d90f061ed99))

## [0.13.6](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.13.5...@aws-amplify/graphql-model-transformer@0.13.6) (2022-04-27)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.13.5](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.13.4...@aws-amplify/graphql-model-transformer@0.13.5) (2022-04-18)

### Bug Fixes

- **graphql-model-transformer:** fix create mutation when index field is null ([#10073](https://github.com/aws-amplify/amplify-cli/issues/10073)) ([1e9d140](https://github.com/aws-amplify/amplify-cli/commit/1e9d140a529e5a2474968feb26b53ac7c9bb5750))

## [0.13.4](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.13.3...@aws-amplify/graphql-model-transformer@0.13.4) (2022-04-07)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.13.3](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.13.2...@aws-amplify/graphql-model-transformer@0.13.3) (2022-03-23)

### Bug Fixes

- **graphql:** avoid static datastructures in gql transform ([#10006](https://github.com/aws-amplify/amplify-cli/issues/10006)) ([cd73fdd](https://github.com/aws-amplify/amplify-cli/commit/cd73fdde69f1545683e81684c4f9267145b845c6))

## [0.13.2](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.13.1...@aws-amplify/graphql-model-transformer@0.13.2) (2022-02-25)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.13.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.13.0...@aws-amplify/graphql-model-transformer@0.13.1) (2022-02-15)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [0.13.0](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.10.8...@aws-amplify/graphql-model-transformer@0.13.0) (2022-01-31)

## 7.6.14 (2022-01-28)

### Features

- `[@maps](https://github.com/maps)To` directive to enable renaming models while retaining data ([#9340](https://github.com/aws-amplify/amplify-cli/issues/9340)) ([aedf45d](https://github.com/aws-amplify/amplify-cli/commit/aedf45d9237812d71bb8b56164efe0222ad3d534))

## [0.10.8](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.10.7...@aws-amplify/graphql-model-transformer@0.10.8) (2022-01-27)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.10.7](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.10.6...@aws-amplify/graphql-model-transformer@0.10.7) (2022-01-20)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.10.6](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.10.5...@aws-amplify/graphql-model-transformer@0.10.6) (2022-01-13)

### Bug Fixes

- clean up missing and unused GraphQL v2 dependencies ([#9486](https://github.com/aws-amplify/amplify-cli/issues/9486)) ([a6ca44e](https://github.com/aws-amplify/amplify-cli/commit/a6ca44e6ea0ec0a70b648e399fc3e849ccc2a7c9))
- use StackMapping for V2 resolvers ([#9238](https://github.com/aws-amplify/amplify-cli/issues/9238)) ([d354e78](https://github.com/aws-amplify/amplify-cli/commit/d354e78dd1e253d9572da3b08a4d8883e2fe673e))

## [0.10.5](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.10.3...@aws-amplify/graphql-model-transformer@0.10.5) (2022-01-10)

## 7.6.7 (2022-01-10)

### Bug Fixes

- **graphql-model-transformer:** add id field to update input objects ([#9276](https://github.com/aws-amplify/amplify-cli/issues/9276)) ([45cd973](https://github.com/aws-amplify/amplify-cli/commit/45cd9736b5fc09d78a3f445f62fc2a971c11fec7))
- **graphql:** correct typo filterExpression on v2 resolvers ([#9412](https://github.com/aws-amplify/amplify-cli/issues/9412)) ([71bf468](https://github.com/aws-amplify/amplify-cli/commit/71bf4688952a5f43640297bf31ea9c59d1c679c9))
- make update input id field required ([#9452](https://github.com/aws-amplify/amplify-cli/issues/9452)) ([345fe28](https://github.com/aws-amplify/amplify-cli/commit/345fe28a60bbf1de32496430e38e25463a77e96c))

## [0.10.3](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.10.2...@aws-amplify/graphql-model-transformer@0.10.3) (2021-12-21)

### Bug Fixes

- generate list types will nullable elements ([#9310](https://github.com/aws-amplify/amplify-cli/issues/9310)) ([e972956](https://github.com/aws-amplify/amplify-cli/commit/e9729565fef2ac7df51f7fc7f345da536f385ac1))
- **graphql-model-transformer:** [@aws](https://github.com/aws)\_lambda GQL transformer pass through directive list ([#9231](https://github.com/aws-amplify/amplify-cli/issues/9231)) ([25f0c9d](https://github.com/aws-amplify/amplify-cli/commit/25f0c9d6d8735bd7f44a70de52b462826aabd8ed))
- handle strings as custom subscription names ([#9210](https://github.com/aws-amplify/amplify-cli/issues/9210)) ([7b068c6](https://github.com/aws-amplify/amplify-cli/commit/7b068c6318b3f9934e5fc1d8e9a142dc31fb5fc1))

## [0.10.2](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.10.1...@aws-amplify/graphql-model-transformer@0.10.2) (2021-12-17)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.10.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.10.0...@aws-amplify/graphql-model-transformer@0.10.1) (2021-12-03)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [0.10.0](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.9.4...@aws-amplify/graphql-model-transformer@0.10.0) (2021-11-23)

### Features

- override support for api category ([#9013](https://github.com/aws-amplify/amplify-cli/issues/9013)) ([ae7b001](https://github.com/aws-amplify/amplify-cli/commit/ae7b001f274f327a29c99c67fe851272c6208e84)), closes [#9001](https://github.com/aws-amplify/amplify-cli/issues/9001) [#8954](https://github.com/aws-amplify/amplify-cli/issues/8954) [#8958](https://github.com/aws-amplify/amplify-cli/issues/8958) [#8960](https://github.com/aws-amplify/amplify-cli/issues/8960) [#8967](https://github.com/aws-amplify/amplify-cli/issues/8967) [#8971](https://github.com/aws-amplify/amplify-cli/issues/8971) [#8976](https://github.com/aws-amplify/amplify-cli/issues/8976) [#8975](https://github.com/aws-amplify/amplify-cli/issues/8975) [#8981](https://github.com/aws-amplify/amplify-cli/issues/8981) [#8983](https://github.com/aws-amplify/amplify-cli/issues/8983) [#8992](https://github.com/aws-amplify/amplify-cli/issues/8992) [#9000](https://github.com/aws-amplify/amplify-cli/issues/9000) [#9002](https://github.com/aws-amplify/amplify-cli/issues/9002) [#9005](https://github.com/aws-amplify/amplify-cli/issues/9005) [#9006](https://github.com/aws-amplify/amplify-cli/issues/9006) [#9007](https://github.com/aws-amplify/amplify-cli/issues/9007) [#9008](https://github.com/aws-amplify/amplify-cli/issues/9008) [#9010](https://github.com/aws-amplify/amplify-cli/issues/9010) [#9011](https://github.com/aws-amplify/amplify-cli/issues/9011) [#9012](https://github.com/aws-amplify/amplify-cli/issues/9012) [#9014](https://github.com/aws-amplify/amplify-cli/issues/9014) [#9015](https://github.com/aws-amplify/amplify-cli/issues/9015) [#9017](https://github.com/aws-amplify/amplify-cli/issues/9017) [#9020](https://github.com/aws-amplify/amplify-cli/issues/9020) [#9024](https://github.com/aws-amplify/amplify-cli/issues/9024) [#9027](https://github.com/aws-amplify/amplify-cli/issues/9027) [#9028](https://github.com/aws-amplify/amplify-cli/issues/9028) [#9029](https://github.com/aws-amplify/amplify-cli/issues/9029) [#9032](https://github.com/aws-amplify/amplify-cli/issues/9032) [#9031](https://github.com/aws-amplify/amplify-cli/issues/9031) [#9035](https://github.com/aws-amplify/amplify-cli/issues/9035) [#9038](https://github.com/aws-amplify/amplify-cli/issues/9038) [#9039](https://github.com/aws-amplify/amplify-cli/issues/9039)

## [0.9.4](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.9.3...@aws-amplify/graphql-model-transformer@0.9.4) (2021-11-21)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.9.3](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.9.2...@aws-amplify/graphql-model-transformer@0.9.3) (2021-11-19)

### Bug Fixes

- **graphql-default-value-transformer:** support for [@default](https://github.com/default) directive for required fields ([#8906](https://github.com/aws-amplify/amplify-cli/issues/8906)) ([dc0179d](https://github.com/aws-amplify/amplify-cli/commit/dc0179d69433db0f838d21ebc849b595f4c60c82))

## [0.9.2](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.9.1...@aws-amplify/graphql-model-transformer@0.9.2) (2021-11-17)

### Bug Fixes

- append apiKey if global auth is enabled and its not default auth ([#8843](https://github.com/aws-amplify/amplify-cli/issues/8843)) ([3aadcde](https://github.com/aws-amplify/amplify-cli/commit/3aadcde2225f0ede5c5d94c2a4cd9d1afece5288))
- passing ddb params from root to nested model stacks ([#8766](https://github.com/aws-amplify/amplify-cli/issues/8766)) ([7124cc0](https://github.com/aws-amplify/amplify-cli/commit/7124cc0c8df9fa3261b51141184c0c635bdff738))

## [0.9.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.7.0...@aws-amplify/graphql-model-transformer@0.9.1) (2021-11-15)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [0.7.0](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.6.4...@aws-amplify/graphql-model-transformer@0.7.0) (2021-11-11)

### Bug Fixes

- datastore logical id ([#8761](https://github.com/aws-amplify/amplify-cli/issues/8761)) ([e86cbb9](https://github.com/aws-amplify/amplify-cli/commit/e86cbb9ebfb7ed22607ffd82f15a6b58a6ec7b3d))
- **graphql-model-transformer:** fixed model transformer ID generation when ID field is not specified ([#8633](https://github.com/aws-amplify/amplify-cli/issues/8633)) ([b515d16](https://github.com/aws-amplify/amplify-cli/commit/b515d1617a98d613b2d9feb424ece12204d63402))
- **graphql-model-transformer:** override resource logical id to fix v1 to v2 transformer migration ([#8597](https://github.com/aws-amplify/amplify-cli/issues/8597)) ([e3a2afb](https://github.com/aws-amplify/amplify-cli/commit/e3a2afbbed6e97f143fc7c83064e2193f4c91bdd))
- **graphql-model-transformer:** subscription resolver logical id fix ([#8712](https://github.com/aws-amplify/amplify-cli/issues/8712)) ([f562f37](https://github.com/aws-amplify/amplify-cli/commit/f562f3714b83903c71217c5901c02c9fc71ff365))
- move [@model](https://github.com/model) params to root stack and fix ds logical id ([#8736](https://github.com/aws-amplify/amplify-cli/issues/8736)) ([df4408c](https://github.com/aws-amplify/amplify-cli/commit/df4408c4080949ddd638778df9ae20e763dd5824))
- override none,DDB,lambda datasource logical IDs ([#8723](https://github.com/aws-amplify/amplify-cli/issues/8723)) ([c534dc4](https://github.com/aws-amplify/amplify-cli/commit/c534dc46704cf2a1264e98d8af9b7a199c1419eb))

### Features

- generate list types as non-null ([#8166](https://github.com/aws-amplify/amplify-cli/issues/8166)) ([93786c1](https://github.com/aws-amplify/amplify-cli/commit/93786c13ef04c72748ca32a1ef7878c0e6b5b129))

## [0.6.4](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.6.3...@aws-amplify/graphql-model-transformer@0.6.4) (2021-10-10)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.6.3](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.6.2...@aws-amplify/graphql-model-transformer@0.6.3) (2021-09-27)

### Bug Fixes

- **graphql-model-transformer:** [@model](https://github.com/model) conflict resolution ([#8035](https://github.com/aws-amplify/amplify-cli/issues/8035)) ([f3bdc4a](https://github.com/aws-amplify/amplify-cli/commit/f3bdc4ac1fcf596f634d9d2e968785e76f7b138c))
- **graphql-model-transformer:** iam role name does not exceed 64 characters ([#8244](https://github.com/aws-amplify/amplify-cli/issues/8244)) ([812a671](https://github.com/aws-amplify/amplify-cli/commit/812a67163d6dd33160bf7ace9afd538c83a7af1a))
- **graphql-model-transformer:** remove unnecessary warnings for resolver config per type ([#8265](https://github.com/aws-amplify/amplify-cli/issues/8265)) ([2f2f0a5](https://github.com/aws-amplify/amplify-cli/commit/2f2f0a5bea59278219c1f4ebb5276927dc5a0fbd))

## [0.6.2](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.6.1...@aws-amplify/graphql-model-transformer@0.6.2) (2021-09-14)

### Bug Fixes

- **graphql-model-transformer:** fix typo in print block ([#8152](https://github.com/aws-amplify/amplify-cli/issues/8152)) ([7377e58](https://github.com/aws-amplify/amplify-cli/commit/7377e58535dd5555d9e11cf3114fb23cdbb1f382))

## [0.6.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.6.0...@aws-amplify/graphql-model-transformer@0.6.1) (2021-09-02)

### Bug Fixes

- add model transformer v2 e2e tests ([#7946](https://github.com/aws-amplify/amplify-cli/issues/7946)) ([351a8bc](https://github.com/aws-amplify/amplify-cli/commit/351a8bce6069398535878fd62886e0ee5c402329))
- model transformer support condition ([#7935](https://github.com/aws-amplify/amplify-cli/issues/7935)) ([fc93dba](https://github.com/aws-amplify/amplify-cli/commit/fc93dbabb38427607ef6abb6f1d7fb2f357a284b))
- update and create input field type known model types filtering ([#7929](https://github.com/aws-amplify/amplify-cli/issues/7929)) ([16334f7](https://github.com/aws-amplify/amplify-cli/commit/16334f7217f0ac751a642d82512240aedec17721))

# [0.6.0](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.5.1...@aws-amplify/graphql-model-transformer@0.6.0) (2021-08-24)

### Bug Fixes

- **graphql-model-transformer:** added [@model](https://github.com/model) name reserved words validation ([#7877](https://github.com/aws-amplify/amplify-cli/issues/7877)) ([781ddbb](https://github.com/aws-amplify/amplify-cli/commit/781ddbb6733803487e16aedc69bb8182a00bcce9))

### Features

- add [@index](https://github.com/index) directive ([#7887](https://github.com/aws-amplify/amplify-cli/issues/7887)) ([e011555](https://github.com/aws-amplify/amplify-cli/commit/e0115557aad893b3286226e92ce8fecbd5636c1a))
- model transformer advanced subscriptions ([#7927](https://github.com/aws-amplify/amplify-cli/issues/7927)) ([1725630](https://github.com/aws-amplify/amplify-cli/commit/1725630c61c40923e8dfa3c697ea5472df2e5de1))

## [0.5.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.5.0...@aws-amplify/graphql-model-transformer@0.5.1) (2021-08-06)

### Bug Fixes

- add DDB params to model v2 ([#7827](https://github.com/aws-amplify/amplify-cli/issues/7827)) ([f43002e](https://github.com/aws-amplify/amplify-cli/commit/f43002ed46d0ee42a64cec3d12322d4ae552a70b))
- **graphql-model-transformer:** model input fields transform ([#7857](https://github.com/aws-amplify/amplify-cli/issues/7857)) ([12ff663](https://github.com/aws-amplify/amplify-cli/commit/12ff663a94a4896bd9eacef3847be15b7631d8df))
- misc [@model](https://github.com/model) v2 VTL cleanup ([#7856](https://github.com/aws-amplify/amplify-cli/issues/7856)) ([98d81d8](https://github.com/aws-amplify/amplify-cli/commit/98d81d8e2e13fc1525389ba21e6ad4b372e671fb))
- use improved pluralization in graphql transformer v2 ([#7817](https://github.com/aws-amplify/amplify-cli/issues/7817)) ([38e2599](https://github.com/aws-amplify/amplify-cli/commit/38e25996ee00479031c88714af3b9d40ef9e079c))

# [0.5.0](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.4.6...@aws-amplify/graphql-model-transformer@0.5.0) (2021-07-30)

### Features

- capability injection for the vNext GraphQL Transformer ([#7735](https://github.com/aws-amplify/amplify-cli/issues/7735)) ([f3eae13](https://github.com/aws-amplify/amplify-cli/commit/f3eae13ab2848df398e26429abf985b756abcff2))

## [0.4.6](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.4.5...@aws-amplify/graphql-model-transformer@0.4.6) (2021-07-27)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.4.5](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.4.4...@aws-amplify/graphql-model-transformer@0.4.5) (2021-07-16)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.4.4](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.4.3...@aws-amplify/graphql-model-transformer@0.4.4) (2021-07-12)

### Bug Fixes

- get mock working with gql transformer v2 ([#7574](https://github.com/aws-amplify/amplify-cli/issues/7574)) ([4fa2900](https://github.com/aws-amplify/amplify-cli/commit/4fa2900d6b9ca515677d06bdffe29f56401b9c86))

## [0.4.3](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.4.2...@aws-amplify/graphql-model-transformer@0.4.3) (2021-06-30)

### Bug Fixes

- update DDB data source name in gql transformer v2 ([#7443](https://github.com/aws-amplify/amplify-cli/issues/7443)) ([7abe3bd](https://github.com/aws-amplify/amplify-cli/commit/7abe3bd5788c0096f68fa5356bb0e7f6384d3bb5))

## [0.4.2](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.4.1...@aws-amplify/graphql-model-transformer@0.4.2) (2021-06-24)

### Bug Fixes

- correct 'tranformer' typo ([#7408](https://github.com/aws-amplify/amplify-cli/issues/7408)) ([9420f1b](https://github.com/aws-amplify/amplify-cli/commit/9420f1b29137fd7621d7d902a147e596776357df))
- remove extra \$ output of model transformer v2 ([#7415](https://github.com/aws-amplify/amplify-cli/issues/7415)) ([a8680a2](https://github.com/aws-amplify/amplify-cli/commit/a8680a2c94d86b6b3fb29cf9b7e04ba8680b907b))

## [0.4.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.4.0...@aws-amplify/graphql-model-transformer@0.4.1) (2021-05-26)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [0.4.0](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.3.6...@aws-amplify/graphql-model-transformer@0.4.0) (2021-05-18)

### Features

- port [@searchable](https://github.com/searchable) to GraphQL Transformer v2 ([#7291](https://github.com/aws-amplify/amplify-cli/issues/7291)) ([37a2df2](https://github.com/aws-amplify/amplify-cli/commit/37a2df2365fe4bf0eddf285a159221e34f695fe2))

## [0.3.6](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.3.4...@aws-amplify/graphql-model-transformer@0.3.6) (2021-05-03)

## 4.50.1 (2021-05-03)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.3.5](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.3.4...@aws-amplify/graphql-model-transformer@0.3.5) (2021-05-03)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.3.4](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.3.3...@aws-amplify/graphql-model-transformer@0.3.4) (2021-03-05)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.3.3](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.3.2...@aws-amplify/graphql-model-transformer@0.3.3) (2021-02-26)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.3.2](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.3.1...@aws-amplify/graphql-model-transformer@0.3.2) (2021-02-11)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

## [0.3.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.3.0...@aws-amplify/graphql-model-transformer@0.3.1) (2021-02-10)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# [0.3.0](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.2.1...@aws-amplify/graphql-model-transformer@0.3.0) (2020-12-11)

### Features

- container-based deployments([#5727](https://github.com/aws-amplify/amplify-cli/issues/5727)) ([fad6377](https://github.com/aws-amplify/amplify-cli/commit/fad6377bd384862ca4429cb1a83eee90efd62b58))

## [0.2.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-model-transformer@0.1.0...@aws-amplify/graphql-model-transformer@0.2.1) (2020-11-22)

**Note:** Version bump only for package @aws-amplify/graphql-model-transformer

# 0.2.0 (2020-11-22)

### Features

- transformer redesign ([#5534](https://github.com/aws-amplify/amplify-cli/issues/5534)) ([a93c685](https://github.com/aws-amplify/amplify-cli/commit/a93c6852f6588898ebc52b0574f4fcc3d2e87948))

# 0.1.0 (2020-11-08)

### Features

- transformer redesign ([#5534](https://github.com/aws-amplify/amplify-cli/issues/5534)) ([a93c685](https://github.com/aws-amplify/amplify-cli/commit/a93c6852f6588898ebc52b0574f4fcc3d2e87948))
