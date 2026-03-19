# Development Commands

Common commands for building, testing, and working with this repository.

## Build & Test

```sh
yarn build              # Build all packages
yarn test               # Run all tests
yarn test-ci            # Run all tests in CI mode (with coverage)
yarn lint               # Check linting (see note below)
yarn setup-dev          # Setup local CLI (amplify-dev)
yarn production-build   # Production build
yarn build-tests        # Build test packages
```

## Linting

`yarn lint` does NOT pass on the full repo (OOM + thousands of existing errors). CI only lints PR-changed files and treats eslint failures as non-blocking (`|| true`). `prettier-check` and `depcheck` DO block in CI.

## License Verification

```sh
yarn verify-dependency-licenses-extract
# Equivalent to: yarn extract-dependency-licenses && ./scripts/verify-dependency-licenses.sh
```

- License changes after dependency updates are expected — always commit `dependency_licenses.txt` changes
- The pre-commit hook runs this automatically

## Local Registry (Verdaccio)

Used for e2e testing. Publishes packages to a local registry.

```sh
# Start Verdaccio (in separate terminal)
npx verdaccio

# Publish packages
yarn publish-to-verdaccio
```
