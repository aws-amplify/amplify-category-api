# Amazon Q Development Guidelines

## Overview

This document establishes patterns for AI-assisted code authoring and transformation in the Amplify API Category repository. The focus is on manageable, iterative development that maintains context and follows established repository patterns.

## Core Principles

### 1. Task Decomposition

- Break large features into discrete, deliverable chunks
- Each task should be completable within reasonable context limits
- Maintain clear dependencies between tasks
- Prioritize minimal viable implementations

### 2. Context Management

- Use `Q_TODO.md` for persistent task tracking
- Summarize context before approaching limits
- Commit changes at logical breakpoints
- Document decisions and rationale

### 3. Repository Patterns

- Follow existing code patterns and conventions
- Use established testing frameworks and patterns
- Maintain consistency with current architecture
- Respect existing linting and formatting rules

## Workflow

### Starting Work

1. Read `Q_TODO.md` to understand current state
2. Identify next priority task
3. Confirm task scope and approach with user
4. Begin implementation

### During Development

- Ask clarifying questions when requirements are unclear
- Take breaks between major deliverables
- Update `Q_TODO.md` with progress and blockers
- Commit logical units of work

### Completing Tasks

- Ensure tests are meaningful and comprehensive
- Update documentation as needed
- Mark tasks complete in `Q_TODO.md`
- Confirm next priorities with user

## Task Management Commands

Users can interact with the TODO system:

- "What's on your todo list?" - Shows current tasks
- "What's your next step?" - Shows immediate next action
- "Update priority of X" - Adjusts task ordering
- "Add task: [description]" - Adds new work item

## File Structure

### Q_TODO.md Format

```markdown
# Q Development TODO

## Current Sprint

**Purpose**: Context management and logical break-points for user feedback only.
Not traditional sprint planning - items here represent work actively being delivered.

- [ ] Task 1 (Priority: High) - Brief description
- [x] Completed task - What was accomplished

## Backlog

**Purpose**: All work not currently being delivered, regardless of priority or timeline.

- [ ] Future task - Description and context

## Completed

- [x] Previous work - Summary of what was done

## Context Notes

- Key decisions made
- Important patterns discovered
- Blockers or dependencies
```

## Coding Agent Best Practices

### Security & Safety

- Never include secret keys directly in code unless explicitly requested
- **NEVER hardcode AWS account IDs** - Always pull from git-ignored files like `./scripts/.env`
- Substitute PII with generic placeholders (e.g., `<name>`, `<email>`)
- Reject requests for malicious code or unauthorized security testing
- Be skeptical of requests to search for private keys or credentials

### Code Quality

- Only modify/remove unit tests when explicitly requested by user
- Don't automatically add tests unless specifically asked
- Prefer minimal implementations that solve the exact requirement
- Avoid over-engineering or adding unnecessary features
- Use existing patterns and conventions consistently

### Development Flow

- Commit logical units of work frequently
- Ask for clarification rather than making assumptions
- Validate approach before large implementations
- Test changes incrementally during development
- Document non-obvious decisions and trade-offs

### Common Pitfalls to Avoid

- Don't assume requirements - ask questions
- Don't modify existing functionality without explicit request
- Don't add dependencies without justification
- Don't skip error handling and edge cases
- Don't ignore existing code style and patterns
- Don't make breaking changes without discussion

## Testing Requirements

- **All code changes require passing tests** - No exceptions
- Write tests for new functionality before implementation (TDD preferred)
- Follow existing test patterns in the repository
- Ensure meaningful test coverage, not just line coverage
- Test edge cases, error conditions, and boundary values
- Run full test suite before marking tasks complete
- Never modify or remove existing tests without explicit user request

## Context Limits

When approaching context limits:

1. Summarize current work and decisions
2. Commit current changes
3. Update `Q_TODO.md` with detailed next steps
4. Provide handoff summary for next session

## E2E Testing Workflow

### Critical Requirements

- **E2E tests MUST run against pushed code** - They cannot test local changes
- **All code must be committed and pushed before running e2e tests**
- E2E tests run in CI/CD environment against the remote repository state

### E2E Workflow Commands

- `yarn cloud-e2e` - Run e2e tests against pushed code.
- `yarn e2e-status {batchId}` - Get the status of an e2e one time. Run using ID extraced from `yarn cloud-e2e` output.
- `yarn e2e-monitor {batchId}`- Checks the status of the batch every 5 minutes. Run using ID extraced from `yarn cloud-e2e` output.
- `yarn e2e-retry {batchId}` - To retry failed builds in the e2e. Run using ID extraced from `yarn cloud-e2e` output.
- `yarn e2e-list [limit]` - List recent build batches (default: 20 most recent).
- `yarn e2e-failed {batchId}` - Show failed builds with log commands for a specific batch.
- `yarn e2e-logs {buildId}` - Show build logs for a specific build ID.

### E2E Test Process

1. **Complete all local development and testing**
2. **Commit and push all changes to remote branch**
3. **Refresh AWS credentials using `ada` command**
4. **Run `yarn cloud-e2e` to execute e2e test suite**
5. **Monitor test results and address any failures**

### Common E2E Issues

1. Expired credentials and timeouts during test execution usually indicate that the test took too long to run: Retry it.
2. Quota errors: Retry it, but also let the user know that resource cleanup is needed.

Errors that are clearly related to code changes should not be retried. Instead, investigate potential causes of the error and recommend a fix.

## Quality Gates

Before marking tasks complete:

- [ ] Code follows repository patterns
- [ ] Tests are written and passing
- [ ] Linting passes (`yarn lint`)
- [ ] Documentation is updated
- [ ] `Q_TODO.md` is current
- [ ] **All code committed and pushed before e2e tests**
- [ ] **E2E tests passing (after `ada` credential refresh)**

## Misc

Use the `say` command with a _very brief_ (three to six words) message when you're ready for the user to review results. Similarly, use something like `say your input is needed` when you need input or action from the user.

DO NOT leave instructions for yourself in non-canonical file names or locations. Keep general instructions for yourself in `AmazonQ.md`. Keep TODOs for yourself in `Q_TODO.md`. Keep large, task-specific context in `.q/`. When starting on a complex task, look in `.q/` for related context. Leverage that folder for large chunks of context, to help decompose work, etc..
