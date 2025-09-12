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

- [ ] Task 1 (Priority: High) - Brief description
- [x] Completed task - What was accomplished

## Backlog

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

## Quality Gates

Before marking tasks complete:

- [ ] Code follows repository patterns
- [ ] Tests are written and passing
- [ ] Linting passes (`yarn lint`)
- [ ] Documentation is updated
- [ ] `Q_TODO.md` is current
