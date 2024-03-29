# Amplify GraphQL Directives

Source of truth for the GraphQL directive definition used by the Amplify GraphQL API.

> :warning: **Intended for internal Amplify use only.**

## Description

This package defines the GraphQL directives in GraphQL syntax.
Each directive is imported into the corresponding GraphQL transformer.
This package is responsible for the name, definition, and argument defaults for a directive.
The GraphQL transformers utilize the GraphQL directives to define the behavior of the transform.

This package also contains the AppSync GraphQL directives.
These directives are defined internally by AppSync.
The definitions here are copied from the internal definition.

This package is intended to be the only source of truth for the GraphQL directive definitions used by the Amplify GraphQL API.
This package should be imported in place of reproducing the definitions in other packages.
