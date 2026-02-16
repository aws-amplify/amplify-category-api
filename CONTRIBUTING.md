# Contributing to Amplify API Category

Thank you for your interest in contributing to our project! 💛

Whether it's a bug report, new feature, correction, or additional documentation, we greatly value feedback and contributions from our community. Please read through these guidelines carefully before submitting a PR or issue and let us know if it's not up-to-date (or even better, submit a PR with your proposed corrections 😉).

- [Getting Started](#getting-started)
  - [Local Environment Setup](#local-environment-setup)
  - [Architecture of the codebase](#architecture-of-the-codebase)
  - [Steps towards contributions](#steps-towards-contributions)
- [Pull Requests](#pull-requests)
- [Bug Reports](#bug-reports)
- [Commits](#commits)
  - [Git Hooks](#git-hooks)
- [Tests](#tests)
- [Debugging](#debugging)
- [Code Style](#code-style)
- [Finding Contributions](#finding-contributions)
- [Community](#community)
- [Code of Conduct](#code-of-conduct)
- [Security Issue Reporting](#security-issue-reporting)
- [Licensing](#licensing)

## Getting Started

Our work is done directly on Github and PR's are sent to the github repo by core team members and contributors. Everyone undergoes the same review process to get their changes into the repo.

This section should get you running with **Amplify API Category** and get you familiar with the basics of the codebase.

### Local Development

#### Environment Setup

1. Ensure you have [Node.js](https://nodejs.org/en/download/) installed, which comes bundled with [`npm`](https://github.com/npm/cli). Use it to install or upgrade [`yarn`](https://classic.yarnpkg.com/en/docs/install):

   ```sh
   npm install --global yarn
   ```

   > If you are using Yarn v2, run `yarn set version classic` to change to Yarn Classic.
   >
   > Note: Ensure that the version of Node installed is < 17.0.0 and >= 14.17.0. During the installation process, some modules may not be compatible with other versions of Node.

1. Ensure you are using the npm registry, even with yarn by running `yarn config set registry https://registry.npmjs.org`

1. Start by [forking](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo) the _main_ branch of [amplify-category-api](https://github.com/aws-amplify/amplify-category-api). Then clone it to your machine to work with it locally using one of the following methods:

   ```sh
   # HTTPS
   git clone https://github.com/[username]/amplify-category-api.git

   # SSH
   git clone git@github.com:[username]/amplify-category-api.git

   # GitHub CLI
   gh repo clone [username]/amplify-category-api
   ```

1. Move into your project folder:

   ```sh
   cd amplify-category-api
   ```

#### Building and Running Tests

1. To build local packages and verify your change is valid and doesn't break the build, you can run :

   ```sh
   yarn # Install all dependencies for the workspace
   yarn build # Build all packages in the repo
   yarn test # Run tests for all packages in the repo
   ```

1. Note: once you've run an initial `yarn` unless you're changing dependencies in a package, re-running should not be necessary.
1. After an initial build, if you're testing changes to a single package, you can run `yarn build` and `yarn test` specifically from that directory (e.g. `/packages/amplify-graphql-model-transformer`) in order to speed up your iteration cycle.

#### Building the CLI Locally for functional testing

1. You can run the `setup-dev` script, which installs dependencies and performs initial configuration:

   ```sh
   # Linux / macOS
   yarn setup-dev

   # Windows
   yarn setup-dev-win
   ```

1. Ensure amplify-dev exists on your path.

   ```sh
   yarn global bin # Update your `$PATH` to include this directory.
   ```

1. To update your local `amplify-dev` executable, you can simply `yarn build` the specific package you're editing, and those changes will be reflected automatically in the dev target.

> NOTE: Make sure to always [sync your fork](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork) with _main_ branch of amplify-category-api

### Architecture of the codebase

Amplify API Category is a monorepo built with [Yarn Workspaces](https://yarnpkg.com/features/workspaces) and [Lerna](https://github.com/lerna/lerna). All the categories of Amplify live within the `packages/` directory in the root. Each category inside packages has its own `src/` and `package.json`.

[**Packages inside Amplify API Monorepo**](https://github.com/aws-amplify/amplify-category-api/tree/main/packages)

### Steps towards contributions

- To make changes with respect to a specific category, go into `packages/[category]`.
- Make changes to required file.
- Write unit tests
- Yarn build
- Run test suite
- Test in sample app using [amplify-dev](#tests)
- Submit a PR

#### What's with all the lint errors?

For a long time, the codebase had relatively lax lint checking. We have now added more strict rules but decided that it wasn't feasible to
update all the code to adhere to the new rules at once. Instead we have opted for an iterative approach where lint errors are fixed as
files are touched. If you are the first person to touch a file since the rules have been inforced we ask that you try your best to address
the lint errors in that file. If addressing an error would significantly increase the scope of the change, it is okay to add a lint disable
comment and a justification in the PR description.

To get lint warnings as you type, configure the ESLint VSCode plugin. Alternatively, run `yarn lint-fix` to auto-fix errors where possible
and print out errors that need manual attention.

## Pull Requests

Pull requests are welcome!

You should open an issue to discuss your pull request, unless it's a trivial change. It's best to ensure that your proposed change would be accepted so that you don't waste your own time. If you would like to implement support for a significant feature that is not yet available, please talk to us beforehand to avoid any duplication of effort.

Pull requests should generally be opened against **_main_**.

Don't include any build files i.e. `dist/` in your PR. These will be built upon publish to npm and when a release is created on GitHub.

### Steps

1. Go through the [Local Environment Setup](#local-environment-setup)
1. Within your local fork, create a new branch based on the issue you're addressing - e.g. `git checkout -b category-auth/admin-auth-support`
   - Use grouping tokens at the beginning of the branch names. For e.g, if you are working on changes specific to `amplify-category-auth`, then you could start the branch name as `category-auth/...`
   - Use slashes to separate parts of branch names
1. Once your work is committed and you're ready to share, run `yarn test`. Manually test your changes in a sample app with different edge cases and also test across different platforms if possible.
1. Run `yarn lint` to find any linting errors
1. Then, push your branch: `git push origin HEAD` (pushes the current branch to origin remote)
1. Open GitHub to create a PR from your newly published branch. Fill out the PR template and submit a PR.
1. Finally, the Amplify Data team will review your PR. Add reviewers based on the core member who is tracking the issue with you or code owners. _In the meantime, address any automated check that fail (such as linting, unit tests, etc. in CI)_

## Bug Reports

Bug reports and feature suggestions are always welcome. Good bug reports are extremely helpful, so thanks in advance!

When filing a bug, please try to be as detailed as possible. In addition to the bug report form information, details like these are incredibly useful:

- A reproducible test case or series of steps
- The date/commit/version(s) of the code you're running
- Any modifications you've made relevant to the bug
- Anything unusual about your environment or deployment

Guidelines for bug reports:

- Check to see if a [duplicate or closed issue](https://github.com/aws-amplify/amplify-category-api/issues?q=is%3Aissue+) already exists!
- Provide a short and descriptive issue title
- Remove any sensitive data from your examples or snippets
- Format any code snippets using [Markdown](https://docs.github.com/en/github/writing-on-github/creating-and-highlighting-code-blocks) syntax
- If you're not using the latest version of the CLI, see if the issue still persists after upgrading - this helps to isolate regressions!

Finally, thank you for taking the time to read this, and taking the time to write a good bug report.

## Commits

Commit messages should follow the [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) specification. For example:

`git commit -m 'docs(api): correct spelling of CHANGELOG'`

Valid commit types are as follows:

- `build`
- `chore`
- `ci`
- `docs`
- `feat`
- `fix`
- `perf`
- `refactor`
- `style`
- `test`

However, we recommend running the monorepo's commit script (`yarn commit` or `npm run commit`) which provides an interactive way to write well formed commit messages:

```sh
yarn commit
```

It helps in constructing a more comprehensive commit message with proper message title, body and footers to describe bug fix or feature implementation, to indicate BREAKING CHANGE, or to reference github issues. It will run through a series of question shown below:

```
? Select the type of change that you're committing: <type of commit (if its a feature, bug fix etc.,>
? What is the scope of this change (e.g. component or file name)? <package name if change is only in one package>
? Write a short, imperative tense description of the change: <short description with length less than 72 char>
? Provide a longer description of the change: (press enter to skip) <long description>
? Are there any breaking changes? Y/N
? Does this change affect any open issues? Y/N
? Add issue references (e.g. "fix #123", "re #123".): <issue number if exists>
```

While making a commit, for the question `What is the scope of this change`, enter the name of the package that received the major codebase changes.

If the git commit directly addressed certain github issues, add the issue references after the `Add issue references` prompt. However, it is NOT required to search through all the github issues to find the ones that might be relevant and reference them in your commit.

### Git Hooks

You will notice the extra actions carried out when you run the `git commit` or `git push` commands on this monorepo, that's because the following git hooks are configured using [husky](https://github.com/typicode/husky/tree/master) (you can see them in the root [package.json](https://github.com/aws-amplify/amplify-cli/blob/f2ac2b27b6b0dbf0c52edbc696c35b71f539c944/package.json#L61) file):

```json
"husky": {
    "hooks": {
        "commit-msg": "commitlint -E HUSKY_GIT_PARAMS",
        "pre-push": "yarn build-tests-changed && yarn split-e2e-tests",
        "pre-commit": "yarn verify-commit && yarn lint-fix"
    }
}
```

> NOTE: To ensure those git hooks properly execute, run `yarn` or `npm install` at the root of this monorepo to install the necessary dev dependency packages.

#### "commit-msg" hook:

The "commit-msg" hook ensures the commit message follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) convention, so that proper [CHANGELOG.md](https://github.com/aws-amplify/amplify-category-api/blob/main/CHANGELOG.md) files and package versions are maintained.

#### "pre-commit" hook:

The "pre-commit" hook runs the [verify-commit](https://github.com/aws-amplify/amplify-cli/blob/master/scripts/verify-commit.ts) script and runs eslint of changed files.

#### "pre-push" hook:

The "pre-push" hook will build test files and run the `split-e2e-tests` script to ensure the correct configuration file is generated for our CICD workflow.

## Tests

Please ensure that your change still passes unit tests, and ideally integration/UI tests. It's OK if you're still working on tests at the time that you submit, but be prepared to be asked about them. Wherever possible, pull requests should contain tests as appropriate. Bugfixes should contain tests that exercise the corrected behavior (i.e., the test should fail without the bugfix and pass with it), and new features should be accompanied by tests exercising the feature.

To run the test suite:

```bash
yarn test
```

To test your category in sample application, do the following:

```sh
cd <your-test-front-end-project>
amplify-dev init
amplify-dev <your-category> <subcommand>
```

## Debugging

Sometimes issues can be solved by doing a clean and fresh build. To start from a clean project state:

1.  Removes ./lib, tsconfig.tsbuildinfo, and node_modules from all packages and run their clean script:

    ```sh
    yarn clean
    ```

1.  Remove all unstaged changes and everything listed in the .gitignore file:

    ```sh
    git clean -fdx
    ```

1.  Reset main branch to that of origin/main:

    ```sh
    git fetch origin && git checkout --track origin/main -B main
    ```

1.  Then, run the `setup-dev` script:

    ```sh
    # Linux / macOS
    yarn setup-dev

    # Windows
    yarn setup-dev-win
    ```

## Code Style

Generally, match the style of the surrounding code. Please ensure your changes don't wildly deviate from those rules. You can run `yarn lint-fix` to identify and automatically fix most style issues.

## Finding Contributions

Looking at the existing issues is a great way to find something to contribute on. As our projects, by default, use the default GitHub issue labels (enhancement/bug/duplicate/help wanted/invalid/question/wontfix), looking at any [`help-wanted`](https://github.com/aws-amplify/amplify-category-api/labels/help-wanted) or [`good first issue`](https://github.com/aws-amplify/amplify-category-api/labels/good%20first%20issue) is a great place to start.

You could also contribute by reporting bugs, reproduction of bugs with sample code, documentation and test improvements.

## Community

Join the [Discord Server](https://discord.com/invite/amplify). If it's your first time contributing, checkout the [`#contributing`](https://discord.com/channels/705853757799399426/882526909374808084) channel.

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](https://aws.github.io/code-of-conduct).
For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq) or contact opensource-codeofconduct@amazon.com with any additional questions or comments.

## Security Issue Reporting

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public GitHub issue.

## Licensing

AWS Amplify Category API is [Apache 2.0](LICENSE)-licensed. Contributions you submit will be released under that license.

We may ask you to sign a [Contributor License Agreement (CLA)](http://en.wikipedia.org/wiki/Contributor_License_Agreement) for larger changes.

## Common Tasks

- [How to write a transformer](https://docs.amplify.aws/cli/plugins/authoring/#authoring-custom-graphql-transformers--directives)

### E2E Test Management

E2E tests run in AWS CodeBuild against pushed code. All changes must be committed and pushed before running e2e tests.

```sh
# Trigger e2e test suite (requires pushed code)
yarn cloud-e2e

# Monitor batch with auto-retry (polls every 5 min)
yarn e2e-monitor {batchId}

# Check status once
yarn e2e-status {batchId}

# Retry failed builds
yarn e2e-retry {batchId}

# List recent batches
yarn e2e-list [limit] [e2e|canary]

# Show failed builds with log commands
yarn e2e-failed {batchId}

# View build logs
yarn e2e-logs {buildId}
```

**Note:** Batch IDs have format `amplify-category-api-e2e-workflow:{UUID}`. Use the full ID with all commands.
