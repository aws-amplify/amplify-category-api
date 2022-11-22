# GraphQL @model Transformer Base

# Reference Documentation

### @model

The original model directive, `@model`, is used to create DynamoDB tables to match the data types specified in your GraphQL schema. You can learn more about this in our [docs](https://docs.amplify.aws/cli/graphql/data-modeling/)

This package establishes the base functionality related to our directives that provide modeling data sources so that it can be extended into full transformer implementations to work against specific sources such as DynamoDB.

### Prerequisites

- You will need to have [nodejs and npm installed](https://nodejs.org/en/download/).
- You will then need to install `lerna` and `yarn` as npm global packages.

```
npm install -g lerna
npm install -g yarn
```

### Installing

Install the dependencies

```
lerna bootstrap
```

And build

```
lerna run build
```

## Running the tests

Tests are written with [jest](https://facebook.github.io/jest/) and can be run for all packages with

```
lerna run test
```

Alternatively, there are some debug configurations defined in [.vscode/launch.json](./.vscode/launch.json) you can use Visual Studio code to add debug breakpoints to debug the code.

## Contributing

TODO

## Versioning

TODO

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
