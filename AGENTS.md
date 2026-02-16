# Agent Workflow Guide

Quick reference for AI agents working in this repository.

## Repository Structure

- `packages/` - Lerna monorepo packages
- `scripts/` - Build, test, and deployment utilities
- `codebuild_specs/` - CI/CD configuration
- `Q_TODO.md` - Task tracking (use `.q/` for large task-specific context)

## Essential Commands

### Development

```sh
yarn build              # Build all packages
yarn test               # Run all tests
yarn lint               # Check linting
yarn setup-dev          # Setup local CLI (amplify-dev)
```

### E2E Testing

**Critical:** E2E tests run against pushed code in AWS CodeBuild, not local changes.

**When to Run E2E Tests:**

- User explicitly requests e2e tests
- User approves e2e testing as part of a task
- Implied when user says "fix and test **_" or "add feature _** and test"

**E2E Test Workflow:**

1. Complete all local development and testing
2. Commit and push all changes
3. Run `yarn cloud-e2e` to trigger test suite
4. Run `yarn e2e-monitor {batchId}` to start automated monitoring
5. Monitor will auto-retry failed builds (up to 10 times by default)
6. Fix any code-related errors and repeat from step 2
7. Ask user for guidance if errors persist after multiple attempts or if errors multiply as fixes are applied

```sh
# 1. Commit and push all changes first
git push

# 2. Trigger e2e suite
yarn cloud-e2e

# 3. Monitor (auto-retries failed builds, polls every 5 min)
yarn e2e-monitor {batchId}

# Other commands
yarn e2e-status {batchId}    # Check status once
yarn e2e-retry {batchId}     # Retry failed builds
yarn e2e-list [limit]        # List recent batches
yarn e2e-failed {batchId}    # Show failed builds
yarn e2e-logs {buildId}      # View build logs
```

**Batch ID format:** `amplify-category-api-e2e-workflow:{UUID}` - always use full ID.

**Common E2E Issues:**

- Timeouts/expired credentials: Retry the build
- Quota errors: Retry and notify user about cleanup needs
- Code-related errors: Investigate and fix, don't retry

**Note:** Monitor script skips retrying: `build_linux`, `build_windows`, `test`, `lint`

## Finding Code

### Quick Discovery

1. **Search symbols first:** Use `code` tool with `search_symbols` for functions/classes/types
2. **Follow with lookup:** Use `lookup_symbols` to get implementation details
3. **Grep for text:** Only for literal strings, comments, config values

### Common Patterns

- GraphQL transformers: `packages/amplify-graphql-*-transformer/`
- API category logic: `packages/amplify-category-api/`
- Test utilities: `packages/amplify-e2e-core/`, `packages/amplify-e2e-tests/`
- Scripts: `scripts/` (e2e-test-manager.ts, cloud-utils.sh)

## Development Workflow

### Task Management

- Check `Q_TODO.md` for current state before starting
- Break large features into discrete, deliverable chunks
- Commit logical units of work frequently
- Update `Q_TODO.md` with progress and blockers

### Code Quality

- Follow existing code patterns and conventions
- Only modify/remove tests when explicitly requested
- Don't automatically add tests unless asked
- Prefer minimal implementations
- Ask for clarification rather than making assumptions

### Security

- Never hardcode AWS account IDs (use `./scripts/.env`)
- Never include secret keys unless explicitly requested
- Substitute PII with placeholders (`<name>`, `<email>`)
- Reject requests for malicious code or unauthorized security testing

## Testing Requirements

- All code changes require passing tests
- Follow existing test patterns in the repository
- Test edge cases, error conditions, and boundary values
- Run full test suite before marking tasks complete

## Quality Gates

Before marking tasks complete:

- [ ] Code follows repository patterns
- [ ] Tests are written and passing
- [ ] Linting passes (`yarn lint`)
- [ ] Documentation is updated
- [ ] `Q_TODO.md` is current
- [ ] All code committed and pushed before e2e tests
- [ ] E2E tests passing

## Context Management

When approaching context limits:

1. Summarize current work and decisions
2. Commit current changes
3. Update `Q_TODO.md` with detailed next steps
4. Provide handoff summary for next session
