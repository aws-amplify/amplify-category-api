# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.5.9](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.5.8...@aws-amplify/graphql-relational-transformer@2.5.9) (2024-07-15)

### Bug Fixes

- add nonScalarFields and arrayFields to schemas with mapped names ([#2689](https://github.com/aws-amplify/amplify-category-api/issues/2689)) ([4feb898](https://github.com/aws-amplify/amplify-category-api/commit/4feb898ae21710bb86dd900faef082c24bc08960)), closes [#2581](https://github.com/aws-amplify/amplify-category-api/issues/2581)
- add translation behavior to disable gen 1 patterns ([#2670](https://github.com/aws-amplify/amplify-category-api/issues/2670)) ([38d1a71](https://github.com/aws-amplify/amplify-category-api/commit/38d1a718ec2b0290f514780c6d1d5f0790ba7764))

## [2.5.8](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.5.7...@aws-amplify/graphql-relational-transformer@2.5.8) (2024-07-02)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.5.7](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.5.6...@aws-amplify/graphql-relational-transformer@2.5.7) (2024-07-01)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.5.6](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.5.5...@aws-amplify/graphql-relational-transformer@2.5.6) (2024-06-25)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.5.5](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.5.4...@aws-amplify/graphql-relational-transformer@2.5.5) (2024-06-06)

### Bug Fixes

- fix selection sets for SQL models with optional dependencies ([#2587](https://github.com/aws-amplify/amplify-category-api/issues/2587)) ([f6b68d9](https://github.com/aws-amplify/amplify-category-api/commit/f6b68d9cf1ce8ff0509e63dcd09447d97303e5c6))

## [2.5.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.5.3...@aws-amplify/graphql-relational-transformer@2.5.4) (2024-06-04)

### Bug Fixes

- redact relational field in mutation & subscription based on model auth rules ([#2536](https://github.com/aws-amplify/amplify-category-api/issues/2536)) ([f72f40e](https://github.com/aws-amplify/amplify-category-api/commit/f72f40e941f5b48966b60f40222abd80505fb034))

## [2.5.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.5.2...@aws-amplify/graphql-relational-transformer@2.5.3) (2024-05-15)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.5.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.5.1...@aws-amplify/graphql-relational-transformer@2.5.2) (2024-05-10)

### Bug Fixes

- fix reference-style relationship validation ([#2533](https://github.com/aws-amplify/amplify-category-api/issues/2533)) ([7b3cf0e](https://github.com/aws-amplify/amplify-category-api/commit/7b3cf0e6fe1d19dffd97723a57deaee693ab448b))

## [2.5.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.5.0...@aws-amplify/graphql-relational-transformer@2.5.1) (2024-05-01)

### Bug Fixes

- **graphql-relational-transformer:** nullability enforcement for references relational fields ([#2510](https://github.com/aws-amplify/amplify-category-api/issues/2510)) ([d540097](https://github.com/aws-amplify/amplify-category-api/commit/d54009736092410b2d6e78ebf116a38298bf03ce))

# [2.5.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.4.4...@aws-amplify/graphql-relational-transformer@2.5.0) (2024-04-26)

### Bug Fixes

- add non-scalar and array fields to SQL relations ([#2501](https://github.com/aws-amplify/amplify-category-api/issues/2501)) ([511f020](https://github.com/aws-amplify/amplify-category-api/commit/511f0202583e3e2110a2c22f3bfd24845ea038c0))
- auto generated id when timestamps: null ([#2470](https://github.com/aws-amplify/amplify-category-api/issues/2470)) ([936a4f9](https://github.com/aws-amplify/amplify-category-api/commit/936a4f9b40ae21a7bd4250616c8d83835bb75784))
- ddb references hasOne returns record if multiple exist ([#2497](https://github.com/aws-amplify/amplify-category-api/issues/2497)) ([c105138](https://github.com/aws-amplify/amplify-category-api/commit/c1051384780c732ea2ddb98301994bda55bb62d9))
- **graphql-relational-transformer:** ddb references relationships with composite sortkeys ([#2425](https://github.com/aws-amplify/amplify-category-api/issues/2425)) ([0c45218](https://github.com/aws-amplify/amplify-category-api/commit/0c45218556794b43faed450cfdba4e36fb8d7436))
- hasMany belongsTo dynamodb references composite primary key ([#2471](https://github.com/aws-amplify/amplify-category-api/issues/2471)) ([6f49747](https://github.com/aws-amplify/amplify-category-api/commit/6f497472703bbc97e7d35e2fae8423fc820934d4))
- propagate operation in references-style ddb resolver ([#2447](https://github.com/aws-amplify/amplify-category-api/issues/2447)) ([460cf21](https://github.com/aws-amplify/amplify-category-api/commit/460cf217ce55ac3ef09749c552aac3a487cded69))
- relational bidirectionality validation and improved error messages ([#2482](https://github.com/aws-amplify/amplify-category-api/issues/2482)) ([568fbc3](https://github.com/aws-amplify/amplify-category-api/commit/568fbc365e4945693f685ba8896d2e5f14031f2d))

### Features

- **graphql-relational-transformer:** DDB references relational directives support (tagged-release.0) ([#2370](https://github.com/aws-amplify/amplify-category-api/issues/2370)) ([bdaaabf](https://github.com/aws-amplify/amplify-category-api/commit/bdaaabfb76d23b2331613c413b9760a01f9e1d8a))

## [2.4.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.4.3...@aws-amplify/graphql-relational-transformer@2.4.4) (2024-04-16)

### Bug Fixes

- **api:** protect sql relational fields when using owner rule ([#2463](https://github.com/aws-amplify/amplify-category-api/issues/2463)) ([53cabe2](https://github.com/aws-amplify/amplify-category-api/commit/53cabe2316a32c5cc6e2f9522d82aa92fd5c0689))

## [2.4.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.4.2...@aws-amplify/graphql-relational-transformer@2.4.3) (2024-04-11)

### Bug Fixes

- propagate mutation context to relational fields ([#2416](https://github.com/aws-amplify/amplify-category-api/issues/2416)) ([fd7f6fb](https://github.com/aws-amplify/amplify-category-api/commit/fd7f6fbc17c199331c4b04debaff69ea0424cd74))

## [2.4.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.4.1...@aws-amplify/graphql-relational-transformer@2.4.2) (2024-03-28)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.4.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.4.0...@aws-amplify/graphql-relational-transformer@2.4.1) (2024-03-13)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [2.4.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.3.6...@aws-amplify/graphql-relational-transformer@2.4.0) (2024-02-28)

### Features

- add implicit fields to filter input ([#2236](https://github.com/aws-amplify/amplify-category-api/issues/2236)) ([f7ec601](https://github.com/aws-amplify/amplify-category-api/commit/f7ec6014d4eecfede186129a6ea19041780bafb3))

## [2.3.6](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.3.5...@aws-amplify/graphql-relational-transformer@2.3.6) (2024-02-05)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.3.5](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.3.4...@aws-amplify/graphql-relational-transformer@2.3.5) (2024-01-30)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.3.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.3.3...@aws-amplify/graphql-relational-transformer@2.3.4) (2024-01-22)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.3.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.3.2...@aws-amplify/graphql-relational-transformer@2.3.3) (2023-12-21)

### Bug Fixes

- Fix manyToMany relationships with Amplify managed table strategies ([#2151](https://github.com/aws-amplify/amplify-category-api/issues/2151)) ([2dccaa6](https://github.com/aws-amplify/amplify-category-api/commit/2dccaa6e76deb33627bb31ca90f6f126d53239d7))

## [2.3.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.3.1...@aws-amplify/graphql-relational-transformer@2.3.2) (2023-12-18)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.3.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.3.0...@aws-amplify/graphql-relational-transformer@2.3.1) (2023-12-14)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [2.3.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.2.3...@aws-amplify/graphql-relational-transformer@2.3.0) (2023-12-06)

### Features

- combine heterogeneous data sources ([#2109](https://github.com/aws-amplify/amplify-category-api/issues/2109)) ([fd58bb5](https://github.com/aws-amplify/amplify-category-api/commit/fd58bb5af4249220d17c9751acf677955aed74ea))

## [2.2.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.2.2...@aws-amplify/graphql-relational-transformer@2.2.3) (2023-11-22)

### Bug Fixes

- Allow custom SQL statements without model declarations ([#2087](https://github.com/aws-amplify/amplify-category-api/issues/2087)) ([ea5b26c](https://github.com/aws-amplify/amplify-category-api/commit/ea5b26cd554f5c74b6431cbad6ccf60ab556478f))

## [2.2.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.2.1...@aws-amplify/graphql-relational-transformer@2.2.2) (2023-11-18)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.2.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.2.0...@aws-amplify/graphql-relational-transformer@2.2.1) (2023-11-16)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [2.2.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.1.8...@aws-amplify/graphql-relational-transformer@2.2.0) (2023-11-15)

### Bug Fixes

- Change 'rds' to 'sql' in public-facing symbols ([#2069](https://github.com/aws-amplify/amplify-category-api/issues/2069)) ([ff374dd](https://github.com/aws-amplify/amplify-category-api/commit/ff374dd8398d3f1138a31669b1a5962122039437))

### Features

- add managed table support in API construct ([#2024](https://github.com/aws-amplify/amplify-category-api/issues/2024)) ([96a0d94](https://github.com/aws-amplify/amplify-category-api/commit/96a0d94fa872a5329da120f53be139833449b815)), closes [#1849](https://github.com/aws-amplify/amplify-category-api/issues/1849) [#1903](https://github.com/aws-amplify/amplify-category-api/issues/1903) [#1940](https://github.com/aws-amplify/amplify-category-api/issues/1940) [#1971](https://github.com/aws-amplify/amplify-category-api/issues/1971) [#1973](https://github.com/aws-amplify/amplify-category-api/issues/1973)
- add postgres engine and update types as needed ([#1979](https://github.com/aws-amplify/amplify-category-api/issues/1979)) ([5257d53](https://github.com/aws-amplify/amplify-category-api/commit/5257d53f1d4d02be71b34ddf6757f22dd5d74aff))
- add refersTo directive transformer for model renaming ([#1830](https://github.com/aws-amplify/amplify-category-api/issues/1830)) ([afbd6f2](https://github.com/aws-amplify/amplify-category-api/commit/afbd6f282bc411313ce098a53a87bb8c6481aa48))
- **api:** rds has many support ([42b4c9f](https://github.com/aws-amplify/amplify-category-api/commit/42b4c9f770dec01f02b397ad2a231232395d577d))
- refersTo supports field name mappings on RDS models ([#1865](https://github.com/aws-amplify/amplify-category-api/issues/1865)) ([ee60011](https://github.com/aws-amplify/amplify-category-api/commit/ee60011f5c41d0442e1096dd16d80e94b900745a))

## [2.1.8](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.1.7...@aws-amplify/graphql-relational-transformer@2.1.8) (2023-11-02)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.1.7](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.1.6...@aws-amplify/graphql-relational-transformer@2.1.7) (2023-10-12)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.1.6](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.1.5...@aws-amplify/graphql-relational-transformer@2.1.6) (2023-10-05)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.1.5](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.1.4...@aws-amplify/graphql-relational-transformer@2.1.5) (2023-10-02)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.1.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.1.3...@aws-amplify/graphql-relational-transformer@2.1.4) (2023-09-20)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.1.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.1.2...@aws-amplify/graphql-relational-transformer@2.1.3) (2023-09-07)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.1.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.1.1...@aws-amplify/graphql-relational-transformer@2.1.2) (2023-08-30)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [2.1.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@2.1.0...@aws-amplify/graphql-relational-transformer@2.1.1) (2023-08-28)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [2.1.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.2.9...@aws-amplify/graphql-relational-transformer@2.1.0) (2023-08-09)

### Features

- bump major version of transformer packages ([2458c84](https://github.com/aws-amplify/amplify-category-api/commit/2458c8426da5772aa669d37e11f99ee9c6c5ac2e))

## [1.2.9](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.2.8...@aws-amplify/graphql-relational-transformer@1.2.9) (2023-07-21)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [1.2.8](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.2.7...@aws-amplify/graphql-relational-transformer@1.2.8) (2023-07-17)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [1.2.7](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.2.6...@aws-amplify/graphql-relational-transformer@1.2.7) (2023-07-07)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [1.2.6](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.2.5...@aws-amplify/graphql-relational-transformer@1.2.6) (2023-07-07)

### Bug Fixes

- trigger republish of dependencies that failed in https://app.circleci.com/pipelines/github/aws-amplify/amplify-category-api/7981/workflows/e7366f04-6f0a-4ee4-9cc2-1772089e8005/jobs/163571 ([f2c7151](https://github.com/aws-amplify/amplify-category-api/commit/f2c7151005e4a9fd29d91ac1af1f3e482a06a5cc))

## [1.2.5](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.2.4...@aws-amplify/graphql-relational-transformer@1.2.5) (2023-07-07)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [1.2.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.2.3...@aws-amplify/graphql-relational-transformer@1.2.4) (2023-06-29)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [1.2.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.2.2...@aws-amplify/graphql-relational-transformer@1.2.3) (2023-06-20)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [1.2.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.2.1...@aws-amplify/graphql-relational-transformer@1.2.2) (2023-06-05)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [1.2.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.2.0...@aws-amplify/graphql-relational-transformer@1.2.1) (2023-05-23)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [1.2.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.1.3...@aws-amplify/graphql-relational-transformer@1.2.0) (2023-05-17)

### Bug Fixes

- **auth:** ownerfield as pk in relational models ([#1389](https://github.com/aws-amplify/amplify-category-api/issues/1389)) ([20a38bd](https://github.com/aws-amplify/amplify-category-api/commit/20a38bd20d315a67280482a7dea5418dd9b0e4af))

### Features

- **datastore-filters:** add filters for DataStore \_deleted property ([9812083](https://github.com/aws-amplify/amplify-category-api/commit/9812083cf6dd39b21d95241b2b637e62ea11083d))

## [1.1.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.1.2...@aws-amplify/graphql-relational-transformer@1.1.3) (2023-04-25)

### Bug Fixes

- **auth:** ownerfield as pk in relational models ([#1389](https://github.com/aws-amplify/amplify-category-api/issues/1389)) ([9b636f7](https://github.com/aws-amplify/amplify-category-api/commit/9b636f71ebef453ea008d828aa8f53ffaff48f8e))

## [1.1.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.1.1...@aws-amplify/graphql-relational-transformer@1.1.2) (2023-03-30)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [1.1.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.1.0...@aws-amplify/graphql-relational-transformer@1.1.1) (2023-03-15)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [1.1.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.11...@aws-amplify/graphql-relational-transformer@1.1.0) (2023-03-01)

### Bug Fixes

- lock CDK v2 version ([#923](https://github.com/aws-amplify/amplify-category-api/issues/923)) ([2afe40c](https://github.com/aws-amplify/amplify-category-api/commit/2afe40cf13e7d1ee7db37988b9b3297768c7bd0a))

### Features

- migrate auth, maps-to, relational, default value transformer to CDK v2 ([#875](https://github.com/aws-amplify/amplify-category-api/issues/875)) ([5c714a9](https://github.com/aws-amplify/amplify-category-api/commit/5c714a9a8436be343477574cb5523c23c96c9338))

# [1.1.0-beta.6](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.10...@aws-amplify/graphql-relational-transformer@1.1.0-beta.6) (2023-02-21)

### Bug Fixes

- lock CDK v2 version ([#923](https://github.com/aws-amplify/amplify-category-api/issues/923)) ([2afe40c](https://github.com/aws-amplify/amplify-category-api/commit/2afe40cf13e7d1ee7db37988b9b3297768c7bd0a))

### Features

- migrate auth, maps-to, relational, default value transformer to CDK v2 ([#875](https://github.com/aws-amplify/amplify-category-api/issues/875)) ([5c714a9](https://github.com/aws-amplify/amplify-category-api/commit/5c714a9a8436be343477574cb5523c23c96c9338))

# [1.1.0-beta.5](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.10...@aws-amplify/graphql-relational-transformer@1.1.0-beta.5) (2023-02-15)

### Bug Fixes

- lock CDK v2 version ([#923](https://github.com/aws-amplify/amplify-category-api/issues/923)) ([2afe40c](https://github.com/aws-amplify/amplify-category-api/commit/2afe40cf13e7d1ee7db37988b9b3297768c7bd0a))

### Features

- migrate auth, maps-to, relational, default value transformer to CDK v2 ([#875](https://github.com/aws-amplify/amplify-category-api/issues/875)) ([5c714a9](https://github.com/aws-amplify/amplify-category-api/commit/5c714a9a8436be343477574cb5523c23c96c9338))

# [1.1.0-beta.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.9...@aws-amplify/graphql-relational-transformer@1.1.0-beta.4) (2023-02-03)

### Bug Fixes

- lock CDK v2 version ([#923](https://github.com/aws-amplify/amplify-category-api/issues/923)) ([2afe40c](https://github.com/aws-amplify/amplify-category-api/commit/2afe40cf13e7d1ee7db37988b9b3297768c7bd0a))

### Features

- migrate auth, maps-to, relational, default value transformer to CDK v2 ([#875](https://github.com/aws-amplify/amplify-category-api/issues/875)) ([5c714a9](https://github.com/aws-amplify/amplify-category-api/commit/5c714a9a8436be343477574cb5523c23c96c9338))

# [1.1.0-beta.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.6...@aws-amplify/graphql-relational-transformer@1.1.0-beta.3) (2022-12-27)

### Bug Fixes

- lock CDK v2 version ([#923](https://github.com/aws-amplify/amplify-category-api/issues/923)) ([2afe40c](https://github.com/aws-amplify/amplify-category-api/commit/2afe40cf13e7d1ee7db37988b9b3297768c7bd0a))

### Features

- migrate auth, maps-to, relational, default value transformer to CDK v2 ([#875](https://github.com/aws-amplify/amplify-category-api/issues/875)) ([5c714a9](https://github.com/aws-amplify/amplify-category-api/commit/5c714a9a8436be343477574cb5523c23c96c9338))

# [1.1.0-beta.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.1.0-beta.0...@aws-amplify/graphql-relational-transformer@1.1.0-beta.2) (2022-12-12)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [1.1.0-beta.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.1.0-beta.0...@aws-amplify/graphql-relational-transformer@1.1.0-beta.1) (2022-11-30)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [1.1.0-beta.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.1.0-cdkv2.3...@aws-amplify/graphql-relational-transformer@1.1.0-beta.0) (2022-11-18)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [1.1.0-cdkv2.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.4...@aws-amplify/graphql-relational-transformer@1.1.0-cdkv2.3) (2022-11-15)

### Bug Fixes

- lock CDK v2 version ([#923](https://github.com/aws-amplify/amplify-category-api/issues/923)) ([2afe40c](https://github.com/aws-amplify/amplify-category-api/commit/2afe40cf13e7d1ee7db37988b9b3297768c7bd0a))

### Features

- migrate auth, maps-to, relational, default value transformer to CDK v2 ([#875](https://github.com/aws-amplify/amplify-category-api/issues/875)) ([5c714a9](https://github.com/aws-amplify/amplify-category-api/commit/5c714a9a8436be343477574cb5523c23c96c9338))

# [1.1.0-cdkv2.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.1.0-cdkv2.1...@aws-amplify/graphql-relational-transformer@1.1.0-cdkv2.2) (2022-11-03)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [1.1.0-cdkv2.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@1.1.0-cdkv2.0...@aws-amplify/graphql-relational-transformer@1.1.0-cdkv2.1) (2022-10-24)

### Bug Fixes

- lock CDK v2 version ([#923](https://github.com/aws-amplify/amplify-category-api/issues/923)) ([2afe40c](https://github.com/aws-amplify/amplify-category-api/commit/2afe40cf13e7d1ee7db37988b9b3297768c7bd0a))

# [1.1.0-cdkv2.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.0...@aws-amplify/graphql-relational-transformer@1.1.0-cdkv2.0) (2022-10-24)

### Features

- migrate auth, maps-to, relational, default value transformer to CDK v2 ([#875](https://github.com/aws-amplify/amplify-category-api/issues/875)) ([5c714a9](https://github.com/aws-amplify/amplify-category-api/commit/5c714a9a8436be343477574cb5523c23c96c9338))

## [0.12.11](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.10...@aws-amplify/graphql-relational-transformer@0.12.11) (2023-02-27)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.12.10](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.9...@aws-amplify/graphql-relational-transformer@0.12.10) (2023-02-10)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.12.9](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.8...@aws-amplify/graphql-relational-transformer@0.12.9) (2023-01-26)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.12.8](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.7...@aws-amplify/graphql-relational-transformer@0.12.8) (2023-01-12)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.12.7](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.6...@aws-amplify/graphql-relational-transformer@0.12.7) (2023-01-12)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.12.6](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.5...@aws-amplify/graphql-relational-transformer@0.12.6) (2022-12-13)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.12.5](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.4...@aws-amplify/graphql-relational-transformer@0.12.5) (2022-12-03)

### Bug Fixes

- **relation-transformer:** relation field nullability in object and input type ([43b7ae3](https://github.com/aws-amplify/amplify-category-api/commit/43b7ae38cb028ae5f0900a7c2aeb3ee695d803dc))
- remove default false ([c48a885](https://github.com/aws-amplify/amplify-category-api/commit/c48a8858d746d2d33c5c3b90d5823903e8045b3f))
- revert the change for belongsTo in hasMany ([05bb29c](https://github.com/aws-amplify/amplify-category-api/commit/05bb29c8ad9d168abdaae3f5028dc56b2157959b))

## [0.12.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.3...@aws-amplify/graphql-relational-transformer@0.12.4) (2022-11-08)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.12.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.2...@aws-amplify/graphql-relational-transformer@0.12.3) (2022-11-04)

### Bug Fixes

- **graphql:** protect relational fields when fields rules are restrictive ([4d3ad19](https://github.com/aws-amplify/amplify-category-api/commit/4d3ad199cf1a7def474a1b891bec554b86a67ea4))

## [0.12.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.1...@aws-amplify/graphql-relational-transformer@0.12.2) (2022-10-26)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.12.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.12.0...@aws-amplify/graphql-relational-transformer@0.12.1) (2022-10-24)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [0.12.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.11.9...@aws-amplify/graphql-relational-transformer@0.12.0) (2022-10-04)

### Bug Fixes

- **relation-transformer:** belongsTo resolves to correct connected fields ([c0d92c7](https://github.com/aws-amplify/amplify-category-api/commit/c0d92c703b3838f5a735c438a20ab3c9b4881987))

### Features

- **graphql:** subscriptions rtf support ([#837](https://github.com/aws-amplify/amplify-category-api/issues/837)) ([99caa22](https://github.com/aws-amplify/amplify-category-api/commit/99caa22d4d48c317ce98bdc7ae7f19d7e3c0ce94))

## [0.11.9](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.11.8...@aws-amplify/graphql-relational-transformer@0.11.9) (2022-09-20)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.11.8](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.11.7...@aws-amplify/graphql-relational-transformer@0.11.8) (2022-09-14)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.11.7](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.11.6...@aws-amplify/graphql-relational-transformer@0.11.7) (2022-08-23)

### Reverts

- Revert "Undo change to directive merge that broke tests" (#756) ([3da2ce6](https://github.com/aws-amplify/amplify-category-api/commit/3da2ce604469d87160de1374f944a891ca9f476b)), closes [#756](https://github.com/aws-amplify/amplify-category-api/issues/756)

## [0.11.6](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.11.5...@aws-amplify/graphql-relational-transformer@0.11.6) (2022-08-18)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.11.5](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.11.4...@aws-amplify/graphql-relational-transformer@0.11.5) (2022-08-16)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.11.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.11.3...@aws-amplify/graphql-relational-transformer@0.11.4) (2022-08-04)

### Bug Fixes

- **graphql:** revert subscriptions server-side filtering ([20cffc0](https://github.com/aws-amplify/amplify-category-api/commit/20cffc0810c23f85127a939c0a3b812f87c2a601))

## [0.11.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.11.2...@aws-amplify/graphql-relational-transformer@0.11.3) (2022-07-26)

### Bug Fixes

- **graphql:** incorrect filter expression on model transformer ([#697](https://github.com/aws-amplify/amplify-category-api/issues/697)) ([a6fc3be](https://github.com/aws-amplify/amplify-category-api/commit/a6fc3beb6746bad8fcca55bb85b6615dee7318c8))

## [0.11.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.11.0...@aws-amplify/graphql-relational-transformer@0.11.2) (2022-07-20)

### Bug Fixes

- use PK name in many to many link object ([a7a8692](https://github.com/aws-amplify/amplify-category-api/commit/a7a8692e9dba189c362443ead508e578ff6b6502))

## [0.11.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.11.0...@aws-amplify/graphql-relational-transformer@0.11.1) (2022-07-14)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [0.11.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.10.1...@aws-amplify/graphql-relational-transformer@0.11.0) (2022-07-01)

### Features

- **graphql:** add runtime filtering support for subscriptions ([#551](https://github.com/aws-amplify/amplify-category-api/issues/551)) ([0a24bb0](https://github.com/aws-amplify/amplify-category-api/commit/0a24bb0444ecc0947218db41094ab4ef4f0e2948))

## [0.10.1](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.10.0...@aws-amplify/graphql-relational-transformer@0.10.1) (2022-06-23)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [0.10.0](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.9.4...@aws-amplify/graphql-relational-transformer@0.10.0) (2022-06-13)

### Features

- add error when using an owner field as a sort key field ([#517](https://github.com/aws-amplify/amplify-category-api/issues/517)) ([201032d](https://github.com/aws-amplify/amplify-category-api/commit/201032d674a8272931fad0c75e9e146a22ed030b))

## [0.9.4](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.9.3...@aws-amplify/graphql-relational-transformer@0.9.4) (2022-06-10)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.9.3](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.9.0...@aws-amplify/graphql-relational-transformer@0.9.3) (2022-06-07)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.9.2](https://github.com/aws-amplify/amplify-category-api/compare/@aws-amplify/graphql-relational-transformer@0.9.0...@aws-amplify/graphql-relational-transformer@0.9.2) (2022-05-31)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.9.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.9.0...@aws-amplify/graphql-relational-transformer@0.9.1) (2022-05-02)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [0.9.0](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.8.1...@aws-amplify/graphql-relational-transformer@0.9.0) (2022-04-29)

### Features

- use sub:username identity claim by default when persisting behind a feature flag ([#10196](https://github.com/aws-amplify/amplify-cli/issues/10196)) ([947aae6](https://github.com/aws-amplify/amplify-cli/commit/947aae6e692653d06d83f3f33298da3a33d87564))

## [0.8.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.8.0...@aws-amplify/graphql-relational-transformer@0.8.1) (2022-04-27)

## 8.0.3 (2022-04-25)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [0.8.0](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.7.11...@aws-amplify/graphql-relational-transformer@0.8.0) (2022-04-18)

### Bug Fixes

- **graphql-model-transformer:** fix create mutation when index field is null ([#10073](https://github.com/aws-amplify/amplify-cli/issues/10073)) ([1e9d140](https://github.com/aws-amplify/amplify-cli/commit/1e9d140a529e5a2474968feb26b53ac7c9bb5750))
- **graphql-model-transformer:** fix enum filter input when queries are set to null ([#10044](https://github.com/aws-amplify/amplify-cli/issues/10044)) ([53bef2e](https://github.com/aws-amplify/amplify-cli/commit/53bef2eb59c0e7540c87a5e43de903889a6d3d1d))

### Features

- add handling of colon-delimited identity claims to query ([#10189](https://github.com/aws-amplify/amplify-cli/issues/10189)) ([d7983f4](https://github.com/aws-amplify/amplify-cli/commit/d7983f411f69e79cbe7508684b31ba9f9f2d9c33))

### Reverts

- Revert "feat: add handling of colon-delimited identity claims to query (#10189)" (#10213) ([9f13064](https://github.com/aws-amplify/amplify-cli/commit/9f13064d592937c82e534c32469053d7e96a169b)), closes [#10189](https://github.com/aws-amplify/amplify-cli/issues/10189) [#10213](https://github.com/aws-amplify/amplify-cli/issues/10213)

## [0.7.11](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.7.10...@aws-amplify/graphql-relational-transformer@0.7.11) (2022-04-07)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.7.10](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.7.9...@aws-amplify/graphql-relational-transformer@0.7.10) (2022-03-23)

### Bug Fixes

- **graphql:** avoid static datastructures in gql transform ([#10006](https://github.com/aws-amplify/amplify-cli/issues/10006)) ([cd73fdd](https://github.com/aws-amplify/amplify-cli/commit/cd73fdde69f1545683e81684c4f9267145b845c6))
- **graphql:** include sort key(s) in many to many directive relation model ([#9580](https://github.com/aws-amplify/amplify-cli/issues/9580)) ([93ebf35](https://github.com/aws-amplify/amplify-cli/commit/93ebf3566992bff95f035f70fe27b4b1871e1d3d))

## [0.7.9](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.7.8...@aws-amplify/graphql-relational-transformer@0.7.9) (2022-03-17)

### Bug Fixes

- **amplify-category-auth:** expand [@auth](https://github.com/auth) directive to explicit set of allowed operations ([#9859](https://github.com/aws-amplify/amplify-cli/issues/9859)) ([e44ed18](https://github.com/aws-amplify/amplify-cli/commit/e44ed189b2c94230cbd5674606ffa488cb6c7bfe))

## [0.7.8](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.7.7...@aws-amplify/graphql-relational-transformer@0.7.8) (2022-03-07)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.7.7](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.7.6...@aws-amplify/graphql-relational-transformer@0.7.7) (2022-02-25)

## 7.6.22 (2022-02-24)

### Bug Fixes

- **graphql-auth-transformer:** fix relational map key schema lookup when using LSI ([#9722](https://github.com/aws-amplify/amplify-cli/issues/9722)) ([1794cda](https://github.com/aws-amplify/amplify-cli/commit/1794cda7658d9d7596b372c2a78b3f753d7d6aaf))
- **graphql-auth-transformer:** update resolver should allow if update operation is set ([#9808](https://github.com/aws-amplify/amplify-cli/issues/9808)) ([44a9bea](https://github.com/aws-amplify/amplify-cli/commit/44a9bea139a9a1483cfbc7db29b84938510ffdca))
- **graphql:** hasMany on model with (queries: null) generate correct scalar filter type ([#9742](https://github.com/aws-amplify/amplify-cli/issues/9742)) ([d75546c](https://github.com/aws-amplify/amplify-cli/commit/d75546cbc308e2c6f3a676ccbe8632fe9711ae0f))
- include default values in index arg validation ([#9759](https://github.com/aws-amplify/amplify-cli/issues/9759)) ([e135e42](https://github.com/aws-amplify/amplify-cli/commit/e135e42ece439dd9925edd8488dbc6a129d92aa8))

## [0.7.6](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.7.5...@aws-amplify/graphql-relational-transformer@0.7.6) (2022-02-15)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.7.5](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.7.1...@aws-amplify/graphql-relational-transformer@0.7.5) (2022-02-10)

## 7.6.19 (2022-02-08)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.7.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.7.0...@aws-amplify/graphql-relational-transformer@0.7.1) (2022-02-03)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [0.7.0](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.20...@aws-amplify/graphql-relational-transformer@0.7.0) (2022-01-31)

## 7.6.14 (2022-01-28)

### Features

- `[@maps](https://github.com/maps)To` directive to enable renaming models while retaining data ([#9340](https://github.com/aws-amplify/amplify-cli/issues/9340)) ([aedf45d](https://github.com/aws-amplify/amplify-cli/commit/aedf45d9237812d71bb8b56164efe0222ad3d534))

## [0.6.20](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.19...@aws-amplify/graphql-relational-transformer@0.6.20) (2022-01-27)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.6.19](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.18...@aws-amplify/graphql-relational-transformer@0.6.19) (2022-01-23)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.6.18](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.17...@aws-amplify/graphql-relational-transformer@0.6.18) (2022-01-20)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.6.17](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.16...@aws-amplify/graphql-relational-transformer@0.6.17) (2022-01-20)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.6.16](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.15...@aws-amplify/graphql-relational-transformer@0.6.16) (2022-01-13)

### Bug Fixes

- clean up missing and unused GraphQL v2 dependencies ([#9486](https://github.com/aws-amplify/amplify-cli/issues/9486)) ([a6ca44e](https://github.com/aws-amplify/amplify-cli/commit/a6ca44e6ea0ec0a70b648e399fc3e849ccc2a7c9))
- **graphql:** modify fields match logic for hasOne directive when using auth directive ([#9459](https://github.com/aws-amplify/amplify-cli/issues/9459)) ([a924892](https://github.com/aws-amplify/amplify-cli/commit/a92489298625d46255263d50bbceb074eb6d2269))
- use StackMapping for V2 resolvers ([#9238](https://github.com/aws-amplify/amplify-cli/issues/9238)) ([d354e78](https://github.com/aws-amplify/amplify-cli/commit/d354e78dd1e253d9572da3b08a4d8883e2fe673e))

## [0.6.15](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.13...@aws-amplify/graphql-relational-transformer@0.6.15) (2022-01-10)

## 7.6.7 (2022-01-10)

### Bug Fixes

- **graphql:** correct typo filterExpression on v2 resolvers ([#9412](https://github.com/aws-amplify/amplify-cli/issues/9412)) ([71bf468](https://github.com/aws-amplify/amplify-cli/commit/71bf4688952a5f43640297bf31ea9c59d1c679c9))

## [0.6.13](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.12...@aws-amplify/graphql-relational-transformer@0.6.13) (2021-12-21)

## 7.6.5 (2021-12-20)

### Bug Fixes

- generate list types will nullable elements ([#9310](https://github.com/aws-amplify/amplify-cli/issues/9310)) ([e972956](https://github.com/aws-amplify/amplify-cli/commit/e9729565fef2ac7df51f7fc7f345da536f385ac1))
- support recursive [@has](https://github.com/has)One/[@has](https://github.com/has)Many with DataStore ([#9336](https://github.com/aws-amplify/amplify-cli/issues/9336)) ([48e51e6](https://github.com/aws-amplify/amplify-cli/commit/48e51e6fbdc429218f84aae7e808bdf9fa280c0d))

## [0.6.12](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.11...@aws-amplify/graphql-relational-transformer@0.6.12) (2021-12-17)

### Bug Fixes

- **graphql-relational-transformer:** [@belongs](https://github.com/belongs)To directive support for Int fields ([#9175](https://github.com/aws-amplify/amplify-cli/issues/9175)) ([452b115](https://github.com/aws-amplify/amplify-cli/commit/452b11549aac4f5ce7cc8fb0720c3e1b10e2457e))
- prevent A <-> B [@has](https://github.com/has)One or [@has](https://github.com/has)Many relationships with DS ([#9230](https://github.com/aws-amplify/amplify-cli/issues/9230)) ([ffa5fc7](https://github.com/aws-amplify/amplify-cli/commit/ffa5fc74e76988a821e152ab8ae3f386b5967381))

## [0.6.11](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.10...@aws-amplify/graphql-relational-transformer@0.6.11) (2021-12-03)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.6.10](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.9...@aws-amplify/graphql-relational-transformer@0.6.10) (2021-12-01)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.6.9](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.8...@aws-amplify/graphql-relational-transformer@0.6.9) (2021-11-29)

## 7.5.4 (2021-11-28)

### Bug Fixes

- handle implicit primary keys in [@many](https://github.com/many)ToMany ([#9111](https://github.com/aws-amplify/amplify-cli/issues/9111)) ([82357a8](https://github.com/aws-amplify/amplify-cli/commit/82357a8fcb9c6565bdde4942efa9b7ba1f192f5e))

## [0.6.8](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.7...@aws-amplify/graphql-relational-transformer@0.6.8) (2021-11-26)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.6.7](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.6...@aws-amplify/graphql-relational-transformer@0.6.7) (2021-11-23)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.6.6](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.5...@aws-amplify/graphql-relational-transformer@0.6.6) (2021-11-21)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.6.5](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.4...@aws-amplify/graphql-relational-transformer@0.6.5) (2021-11-20)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.6.4](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.2...@aws-amplify/graphql-relational-transformer@0.6.4) (2021-11-19)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.6.3](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.2...@aws-amplify/graphql-relational-transformer@0.6.3) (2021-11-19)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

## [0.6.2](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.6.1...@aws-amplify/graphql-relational-transformer@0.6.2) (2021-11-17)

### Bug Fixes

- **graphql-relational-transformer:** fixes belongs to relation field name ([#8865](https://github.com/aws-amplify/amplify-cli/issues/8865)) ([068b03b](https://github.com/aws-amplify/amplify-cli/commit/068b03bd4c78c840c74557b05f5d109c2c300210))
- reintroduce connection stack in transformer v2 ([#8757](https://github.com/aws-amplify/amplify-cli/issues/8757)) ([81ffeeb](https://github.com/aws-amplify/amplify-cli/commit/81ffeeb7fecfbad1200e45291cb8052be025f761))

## [0.6.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.4.0...@aws-amplify/graphql-relational-transformer@0.6.1) (2021-11-15)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [0.4.0](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.3.1...@aws-amplify/graphql-relational-transformer@0.4.0) (2021-11-11)

### Bug Fixes

- [@auth](https://github.com/auth) fix relational auth, authv2 e2e with utils and fixes ([#8450](https://github.com/aws-amplify/amplify-cli/issues/8450)) ([aa320cd](https://github.com/aws-amplify/amplify-cli/commit/aa320cd2414665a484438f0764cf68fd78caa26a))
- add [@manytomany](https://github.com/manytomany) join table auth ([#8460](https://github.com/aws-amplify/amplify-cli/issues/8460)) ([424bbda](https://github.com/aws-amplify/amplify-cli/commit/424bbda410fbab100d475d37fa9ab291bfd05317))
- allow duplicate auth rules when creating the join type ([#8680](https://github.com/aws-amplify/amplify-cli/issues/8680)) ([1a0636d](https://github.com/aws-amplify/amplify-cli/commit/1a0636d72d010b9d0ed18d511f853bcbffa9d421))
- **graphql-model-transformer:** override resource logical id to fix v1 to v2 transformer migration ([#8597](https://github.com/aws-amplify/amplify-cli/issues/8597)) ([e3a2afb](https://github.com/aws-amplify/amplify-cli/commit/e3a2afbbed6e97f143fc7c83064e2193f4c91bdd))
- **graphql-relational-schema-transformer:** has-many transformer update filter/condition inputs ([#8565](https://github.com/aws-amplify/amplify-cli/issues/8565)) ([9f5570b](https://github.com/aws-amplify/amplify-cli/commit/9f5570b6095ba57f2f3e514279a2f13f041e2b38))
- **graphql-relational-transformer:** fix belongs to e2e test ([#8738](https://github.com/aws-amplify/amplify-cli/issues/8738)) ([233ed56](https://github.com/aws-amplify/amplify-cli/commit/233ed56d2fc74020321816c53555cb04b23b9d6a))
- **graphql-relational-transformer:** fix has many without fields ([#8700](https://github.com/aws-amplify/amplify-cli/issues/8700)) ([cc21d4d](https://github.com/aws-amplify/amplify-cli/commit/cc21d4dcf827a9ef27a89dffe828f3726a03ecea))
- **graphql-relational-transformer:** fixed has one and belongs to relationship ([#8679](https://github.com/aws-amplify/amplify-cli/issues/8679)) ([8a390fb](https://github.com/aws-amplify/amplify-cli/commit/8a390fba8a34002abb94d28702db2dde088811d9))
- reuse foreign key field in `[@belongs](https://github.com/belongs)To` transformer ([#8557](https://github.com/aws-amplify/amplify-cli/issues/8557)) ([39fbe6f](https://github.com/aws-amplify/amplify-cli/commit/39fbe6f61687a0ffbaff5914069f64a69c23e0d6))
- use output when looking up relational related type index ([#8657](https://github.com/aws-amplify/amplify-cli/issues/8657)) ([1f5dd5c](https://github.com/aws-amplify/amplify-cli/commit/1f5dd5ce2eeb3b91a13c7e2bd9e3ffbfcab0c3fe))

### Features

- add admin roles which have admin control over a graphql api ([#8601](https://github.com/aws-amplify/amplify-cli/issues/8601)) ([4d50df0](https://github.com/aws-amplify/amplify-cli/commit/4d50df000c6e11165d2da766c0eaa0097d88a0c2))
- generate list types as non-null ([#8166](https://github.com/aws-amplify/amplify-cli/issues/8166)) ([93786c1](https://github.com/aws-amplify/amplify-cli/commit/93786c13ef04c72748ca32a1ef7878c0e6b5b129))

## [0.3.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.3.0...@aws-amplify/graphql-relational-transformer@0.3.1) (2021-10-10)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# [0.3.0](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.2.1...@aws-amplify/graphql-relational-transformer@0.3.0) (2021-09-27)

### Features

- add [@many](https://github.com/many)ToMany directive ([#8195](https://github.com/aws-amplify/amplify-cli/issues/8195)) ([cc644eb](https://github.com/aws-amplify/amplify-cli/commit/cc644ebc4968f29ad6b3f0b42013d7ee6a142f7e))

## [0.2.1](https://github.com/aws-amplify/amplify-cli/compare/@aws-amplify/graphql-relational-transformer@0.2.0...@aws-amplify/graphql-relational-transformer@0.2.1) (2021-09-14)

**Note:** Version bump only for package @aws-amplify/graphql-relational-transformer

# 0.2.0 (2021-09-02)

### Features

- add new relational modeling directives ([#7997](https://github.com/aws-amplify/amplify-cli/issues/7997)) ([e9cdb7a](https://github.com/aws-amplify/amplify-cli/commit/e9cdb7a1a45b8f16546952a469ab2d45f82e855c))
