<a href="https://aws-amplify.github.io/" target="_blank">
    <img src="https://s3.amazonaws.com/aws-mobile-hub-images/aws-amplify-logo.png" alt="AWS Amplify" width="550" >
</a>

<p>
  <a href="https://discord.gg/jWVbPfC" target="_blank">
    <img src="https://img.shields.io/discord/308323056592486420?logo=discord"" alt="Discord Chat" />  
  </a>
  <a href="https://www.npmjs.com/package/@aws-amplify/cli">
    <img src="https://img.shields.io/npm/v/@aws-amplify/cli.svg" />
  </a>
  <a href="https://circleci.com/gh/aws-amplify/amplify-category-api">
    <img src="https://img.shields.io/circleci/project/github/aws-amplify/amplify-category-api/main.svg" alt="build:started">
  </a>
</p>

### Reporting Bugs/Feature Requests

[![Open Bugs](https://img.shields.io/github/issues/aws-amplify/amplify-category-api/bug?color=d73a4a&label=bugs)](https://github.com/aws-amplify/amplify-category-api/issues?q=is%3Aissue+is%3Aopen+label%3Abug)
[![Feature Requests](https://img.shields.io/github/issues/aws-amplify/amplify-category-api/feature-request?color=ff9001&label=feature%20requests)](https://github.com/aws-amplify/amplify-category-api/issues?q=is%3Aissue+label%3Afeature-request+is%3Aopen)
[![Enhancements](https://img.shields.io/github/issues/aws-amplify/amplify-category-api/enhancement?color=4287f5&label=enhancement)](https://github.com/aws-amplify/amplify-category-api/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
[![Closed Issues](https://img.shields.io/github/issues-closed/aws-amplify/amplify-category-api?color=%2325CC00&label=issues%20closed)](https://github.com/aws-amplify/amplify-category-api/issues?q=is%3Aissue+is%3Aclosed+)

# AWS Amplify API Category

The AWS Amplify CLI is a toolchain which includes a robust feature set for simplifying mobile and web application development. The CLI uses AWS CloudFormation and nested stacks to allow you to add or modify configurations locally before you push them for execution in your account.

- [Install the CLI](#install-the-cli)
- [Tutorials](#tutorials)
- [Contributing](#contributing)
- [Changelog](https://github.com/aws-amplify/amplify-category-api/releases/latest)

This repo manages the API category within Amplify CLI. The Category is responsible for managing graphql build and transformation processes, generating resources to deploy into your cloud stack in order to compute and store data for your graphql and REST endpoints, and providing inputs to codegen processes for use later in your end application.

## Install the CLI

- Requires Node.js® version 22 or later

Install and configure the Amplify CLI as follows:

```bash
$ npm install -g @aws-amplify/cli
$ amplify configure
```

**_Note_**: If you're having permission issues on your system installing the CLI, please try the following command:

```bash
$ sudo npm install -g @aws-amplify/cli --unsafe-perm=true
$ amplify configure
```

### Category specific commands:

The following table lists the current set of commands supported by the Amplify API Category Plugin.

| Command                            | Description                                                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| amplify api add                    | Takes you through steps in the CLI to add an API resource to your backend.                                                              |
| amplify api add-graphql-datasource | Takes you through the steps in the CLI to import an already existing Aurora Serverless data source to an existing GraphQL API resource. |
| amplify api update                 | Takes you through steps in the CLI to update an API resource.                                                                           |
| amplify api gql-compile            | Compiles your GraphQL schema and generates a corresponding cloudformation template.                                                     |
| amplify api push                   | Provisions only API cloud resources with the latest local developments.                                                                 |
| amplify api remove                 | Removes an API resource from your local backend. The resource is removed from the cloud on the next push command.                       |

## Tutorials

- [Getting Started guide](https://docs.amplify.aws/start)
- [GraphQL transform tutorial](https://docs.amplify.aws/cli/graphql-transformer/overview)

## Developing

To set up your local development environment, go to [Local Environment Setup](https://github.com/aws-amplify/amplify-category-api/blob/main/CONTRIBUTING.md#local-environment-setup).

To test your category, do the following:

```sh
cd <your-test-front-end-project>
amplify-dev init
amplify-dev <your-category> <subcommand>
```

Before pushing code or sending a pull request, do the following:

- At the command line, run `yarn lint` at the top-level directory. This invokes eslint to check for lint errors in all of our packages.
- You can use `yarn lint` to find some of the lint errors. To attempt fix them, go to the package that has errors and run `yarn lint-fix`
- If there are any remaining lint errors, resolve them manually. Linting your code is a best practice that ensures good code quality so it's important that you don't skip this step.

## Contributing

We are thankful for any contributions from the community. Look at our [Contribution Guidelines](https://github.com/aws-amplify/amplify-category-api/blob/main/CONTRIBUTING.md).
