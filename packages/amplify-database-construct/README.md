# Amplify Database Construct

[![View on Construct Hub](https://constructs.dev/badge?package=%40aws-amplify%2Fdatabase-construct)](https://constructs.dev/packages/@aws-amplify/database-construct)

This package vends an L3 CDK Construct to create a Aurora DB cluster for the Amplify GraphQL API.

## Examples

### Basic Example

TODO

```ts
import { AmplifyDatabaseCluster } from '@aws-amplify/database-construct';
import { AmplifyGraphQLAPI } from '@aws-amplify/graphql-api-construct';

const databaseCluster = new AmplifyDatabaseCluster({
  dbType: 'POSTGRES',
});

const dbManager = AmplifyDatabaseManager({
  databaseCluster,
});

dbManager.sqlStatment('create Todo table sql statement');

const schema = `
  type Todo @model {
    content: String
  }
`;

new AmplifyGraphQLAPI({
  definition: AmplifyGraphqlDefinition.fromString(
    // graphql schema needs to match databaseCluster sql schema
    // gen 2 will provide compile time type checking
    schema,
    databaseCluster.dataSourceStrategy,
  ),
});
```

# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### AmplifyDatabase <a name="AmplifyDatabase" id="@aws-amplify/database-construct.AmplifyDatabase"></a>

#### Initializers <a name="Initializers" id="@aws-amplify/database-construct.AmplifyDatabase.Initializer"></a>

```typescript
import { AmplifyDatabase } from '@aws-amplify/database-construct'

new AmplifyDatabase(scope: Construct, id: string, props: AmplifyDatabaseProps)
```

| **Name**                                                                                                      | **Type**                                                                                              | **Description**   |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------- |
| <code><a href="#@aws-amplify/database-construct.AmplifyDatabase.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code>                                                                     | _No description._ |
| <code><a href="#@aws-amplify/database-construct.AmplifyDatabase.Initializer.parameter.id">id</a></code>       | <code>string</code>                                                                                   | _No description._ |
| <code><a href="#@aws-amplify/database-construct.AmplifyDatabase.Initializer.parameter.props">props</a></code> | <code><a href="#@aws-amplify/database-construct.AmplifyDatabaseProps">AmplifyDatabaseProps</a></code> | _No description._ |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@aws-amplify/database-construct.AmplifyDatabase.Initializer.parameter.scope"></a>

- _Type:_ constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@aws-amplify/database-construct.AmplifyDatabase.Initializer.parameter.id"></a>

- _Type:_ string

---

##### `props`<sup>Required</sup> <a name="props" id="@aws-amplify/database-construct.AmplifyDatabase.Initializer.parameter.props"></a>

- _Type:_ <a href="#@aws-amplify/database-construct.AmplifyDatabaseProps">AmplifyDatabaseProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name**                                                                                      | **Description**                                    |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| <code><a href="#@aws-amplify/database-construct.AmplifyDatabase.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@aws-amplify/database-construct.AmplifyDatabase.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name**                                                                                            | **Description**               |
| --------------------------------------------------------------------------------------------------- | ----------------------------- |
| <code><a href="#@aws-amplify/database-construct.AmplifyDatabase.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@aws-amplify/database-construct.AmplifyDatabase.isConstruct"></a>

```typescript
import { AmplifyDatabase } from '@aws-amplify/database-construct'

AmplifyDatabase.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@aws-amplify/database-construct.AmplifyDatabase.isConstruct.parameter.x"></a>

- _Type:_ any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name**                                                                                                                   | **Type**                                                                                                      | **Description**                                  |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| <code><a href="#@aws-amplify/database-construct.AmplifyDatabase.property.node">node</a></code>                             | <code>constructs.Node</code>                                                                                  | The tree node.                                   |
| <code><a href="#@aws-amplify/database-construct.AmplifyDatabase.property.dataSourceStrategy">dataSourceStrategy</a></code> | <code>@aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy</code>                              | _No description._                                |
| <code><a href="#@aws-amplify/database-construct.AmplifyDatabase.property.resources">resources</a></code>                   | <code><a href="#@aws-amplify/database-construct.AmplifyDatabaseResources">AmplifyDatabaseResources</a></code> | Generated L1 and L2 CDK resources.               |
| <code><a href="#@aws-amplify/database-construct.AmplifyDatabase.property.stack">stack</a></code>                           | <code>aws-cdk-lib.Stack</code>                                                                                | Reference to parent stack of database construct. |

---

##### `node`<sup>Required</sup> <a name="node" id="@aws-amplify/database-construct.AmplifyDatabase.property.node"></a>

```typescript
public readonly node: Node;
```

- _Type:_ constructs.Node

The tree node.

---

##### `dataSourceStrategy`<sup>Required</sup> <a name="dataSourceStrategy" id="@aws-amplify/database-construct.AmplifyDatabase.property.dataSourceStrategy"></a>

```typescript
public readonly dataSourceStrategy: SQLLambdaModelDataSourceStrategy;
```

- _Type:_ @aws-amplify/graphql-api-construct.SQLLambdaModelDataSourceStrategy

---

##### `resources`<sup>Required</sup> <a name="resources" id="@aws-amplify/database-construct.AmplifyDatabase.property.resources"></a>

```typescript
public readonly resources: AmplifyDatabaseResources;
```

- _Type:_ <a href="#@aws-amplify/database-construct.AmplifyDatabaseResources">AmplifyDatabaseResources</a>

Generated L1 and L2 CDK resources.

---

##### `stack`<sup>Required</sup> <a name="stack" id="@aws-amplify/database-construct.AmplifyDatabase.property.stack"></a>

```typescript
public readonly stack: Stack;
```

- _Type:_ aws-cdk-lib.Stack

Reference to parent stack of database construct.

---

## Structs <a name="Structs" id="Structs"></a>

### AmplifyDatabaseProps <a name="AmplifyDatabaseProps" id="@aws-amplify/database-construct.AmplifyDatabaseProps"></a>

Input props for the AmplifyDatabase construct.

#### Initializer <a name="Initializer" id="@aws-amplify/database-construct.AmplifyDatabaseProps.Initializer"></a>

```typescript
import { AmplifyDatabaseProps } from '@aws-amplify/database-construct'

const amplifyDatabaseProps: AmplifyDatabaseProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name**                                                                                                | **Type**                              | **Description**   |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------- |
| <code><a href="#@aws-amplify/database-construct.AmplifyDatabaseProps.property.dbType">dbType</a></code> | <code>string</code>                   | _No description._ |
| <code><a href="#@aws-amplify/database-construct.AmplifyDatabaseProps.property.vpc">vpc</a></code>       | <code>aws-cdk-lib.aws_ec2.IVpc</code> | _No description._ |

---

##### `dbType`<sup>Required</sup> <a name="dbType" id="@aws-amplify/database-construct.AmplifyDatabaseProps.property.dbType"></a>

```typescript
public readonly dbType: string;
```

- _Type:_ string

---

##### `vpc`<sup>Required</sup> <a name="vpc" id="@aws-amplify/database-construct.AmplifyDatabaseProps.property.vpc"></a>

```typescript
public readonly vpc: IVpc;
```

- _Type:_ aws-cdk-lib.aws_ec2.IVpc

---

### AmplifyDatabaseResources <a name="AmplifyDatabaseResources" id="@aws-amplify/database-construct.AmplifyDatabaseResources"></a>

#### Initializer <a name="Initializer" id="@aws-amplify/database-construct.AmplifyDatabaseResources.Initializer"></a>

```typescript
import { AmplifyDatabaseResources } from '@aws-amplify/database-construct'

const amplifyDatabaseResources: AmplifyDatabaseResources = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name**                                                                                                                      | **Type**                                            | **Description**                                |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| <code><a href="#@aws-amplify/database-construct.AmplifyDatabaseResources.property.consoleSecret">consoleSecret</a></code>     | <code>aws-cdk-lib.aws_secretsmanager.ISecret</code> | Username and password for the console user.    |
| <code><a href="#@aws-amplify/database-construct.AmplifyDatabaseResources.property.dataApiSecret">dataApiSecret</a></code>     | <code>aws-cdk-lib.aws_secretsmanager.ISecret</code> | Username and password for the data API user.   |
| <code><a href="#@aws-amplify/database-construct.AmplifyDatabaseResources.property.databaseCluster">databaseCluster</a></code> | <code>aws-cdk-lib.aws_rds.IDatabaseCluster</code>   | The database cluster created by the construct. |

---

##### `consoleSecret`<sup>Required</sup> <a name="consoleSecret" id="@aws-amplify/database-construct.AmplifyDatabaseResources.property.consoleSecret"></a>

```typescript
public readonly consoleSecret: ISecret;
```

- _Type:_ aws-cdk-lib.aws_secretsmanager.ISecret

Username and password for the console user.

The Console user is used in the "sandbox in the cloud" for development on DB schema.

---

##### `dataApiSecret`<sup>Required</sup> <a name="dataApiSecret" id="@aws-amplify/database-construct.AmplifyDatabaseResources.property.dataApiSecret"></a>

```typescript
public readonly dataApiSecret: ISecret;
```

- _Type:_ aws-cdk-lib.aws_secretsmanager.ISecret

Username and password for the data API user.

The Data API user is used to apply migrations and run SQL queries.

---

##### `databaseCluster`<sup>Required</sup> <a name="databaseCluster" id="@aws-amplify/database-construct.AmplifyDatabaseResources.property.databaseCluster"></a>

```typescript
public readonly databaseCluster: IDatabaseCluster;
```

- _Type:_ aws-cdk-lib.aws_rds.IDatabaseCluster

The database cluster created by the construct.

---
