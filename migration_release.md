# Migration Release

Migration features are released in experimental mode. Several code changes are needed for the official migrations release.

1. Some features are marked as experimental.
1. The @experimental tag should be removed
1. Final naming of exports should be decided.
1. CLI feature flag `enableGen2Migration` needs to be released in the Gen 1 CLI.
1. https://github.com/aws-amplify/amplify-category-api/pull/2930
1. Some E2E tests rely on the feature flag and are using a workaround until the feature flag is released.

Search the codebase for `// TODO: GEN1_GEN2_MIGRATION` and follow the instructions following the comment.
