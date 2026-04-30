# Agent Documentation Index

This is the central index for all agent-operational documentation. Before starting any task, find the relevant doc here. If a doc doesn't exist for what you need, create one and add it to this index.

## Documentation Map

| Document                                                       | When to Use                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [Development Commands](./DEVELOPMENT.md)                       | Building, testing, linting, and other common commands                           |
| [E2E Testing](./E2E_TESTING.md)                                | Running, monitoring, and debugging e2e tests (cloud and local)                  |
| [Dependabot & Dependencies](./DEPENDABOT.md)                   | Handling dependency upgrades, security alerts, Dependabot PRs                   |
| [Code Navigation & Architecture](./CODE_NAVIGATION.md)         | Codebase architecture, package catalog, dependency graph, where to find things  |
| [Customer Experience & Known Issues](./CUSTOMER_EXPERIENCE.md) | What customers build, how they use the API, common problems, outstanding issues |

## Repository Structure (Quick Reference)

- `packages/` — Lerna monorepo packages
- `scripts/` — Build, test, and deployment utilities
- `codebuild_specs/` — CI/CD build spec configuration

## Documentation Maintenance Rules

Agents are responsible for keeping these docs accurate and well-organized:

1. **Fix redundancy on sight.** If you find the same information in two places, consolidate it into the correct doc and remove the duplicate.
2. **Relocate misplaced knowledge.** If you find operational details outside `.agent-docs/`, move them here and update references.
3. **Fill gaps proactively.** If you had trouble finding information you needed, update or create a doc so the next session doesn't struggle.
4. **Keep the index current.** Every doc in this folder must be listed in this README. No orphan files.
5. **Avoid sprawl.** Prefer updating an existing doc over creating a new one. Only create a new doc when the topic is clearly distinct from all existing docs.
