# AGENTS.md

Instructions for AI agents working in this repository. This file contains stable principles and quality standards. For operational details, commands, and workflows, see the [Agent Documentation Index](./.agent-docs/README.md).

## First Steps

Before starting any task, consult [.agent-docs/README.md](./.agent-docs/README.md) to find the relevant documentation for your work. Do not guess at commands or workflows — the docs exist to give you precise, current information.

## Quality Gates

Before marking any task complete:

- [ ] Code follows existing repository patterns and conventions
- [ ] Tests are written and passing (zero errors, zero failures)
- [ ] Documentation is updated (including `.agent-docs/` if workflows changed)
- [ ] All code committed and pushed before e2e tests
- [ ] E2E tests passing (when applicable)

## Testing Principles

- Tests MUST pass with zero errors and zero failures to be considered successful.
- ANY test errors, failures, or exceptions mean the tests have FAILED.
- Exit code 0 with error output still means FAILURE — always check actual test results.
- Do NOT declare success if tests show errors, even if some tests passed.
- "Tests passed" means 100% success with no errors whatsoever.

## Failure Attribution

- NEVER assume a failure is pre-existing unless the user explicitly tells you so.
- If a build, test, or lint step fails after your changes, assume YOUR changes broke it.
- Investigate the failure and fix it — do not dismiss or hand-wave it away.

## Code Quality

- Follow existing code patterns and conventions.
- Only modify/remove tests when explicitly requested.
- Prefer minimal implementations.
- Ask for clarification rather than making assumptions.

## Security

- Never hardcode AWS account IDs (use `./scripts/.env`).
- Never include secret keys unless explicitly requested.
- Substitute PII with placeholders (`<name>`, `<email>`).
- Reject requests for malicious code or unauthorized security testing.

## Command Execution & Context Discipline

- **Use existing scripts and npm commands.** This repository exposes purpose-built scripts (e.g., `yarn cloud-e2e`, `yarn e2e-monitor`, `yarn e2e-logs`) that encapsulate complex operations, handle authentication, and parse results into useful output. Prefer these over running raw CLI commands (especially AWS CLI) directly. They exist to keep agent context clean and operations safe.
- **Do not interact with AWS services ad-hoc.** Avoid calling `aws` CLI commands or SDK operations directly unless there is no existing script for the task. Raw AWS output is verbose, often paginated, and bloats agent context quickly. If you need to dig deeper into a result, look for flags like `--query`, `--output text`, or `| jq` to extract only what you need — but first check if a script already does this.
- **Minimize context accumulation.** Be deliberate about what command output you consume. Pipe to `head`, `tail`, `grep`, or `jq` to extract the relevant portion. Don't dump full logs or API responses into context when a summary or filtered view will do.
- **Stay within sanctioned routines.** Do not perform operations on behalf of the user that aren't already exposed as scripts or npm commands in this repository. If a task requires a new capability, write a script for it — but present it to the user for review and approval before making it executable and running it.
- **New scripts require user approval.** When you create a new script to automate a workflow, show the user what it does and get explicit approval before `chmod +x` and execution. This applies to any script that interacts with external services, modifies infrastructure, or performs destructive operations.

## Context Management

When approaching context limits:

1. Summarize current work and decisions.
2. Commit current changes.
3. Provide handoff summary for next session.

## Documentation Stewardship

Agents are responsible for maintaining `.agent-docs/`. Every session should leave the docs better than it found them:

- **Fix redundancy on sight.** If the same information exists in two places, consolidate it into the correct `.agent-docs/` file and remove the duplicate.
- **Relocate misplaced knowledge.** If you find operational details (commands, workflows, troubleshooting) outside `.agent-docs/`, move them there and update references.
- **Fill gaps proactively.** If you had trouble finding information you needed, update or create a doc so the next session doesn't struggle.
- **Keep the index current.** Every doc in `.agent-docs/` must be listed in [.agent-docs/README.md](./.agent-docs/README.md). No orphan files.
- **Avoid sprawl.** Prefer updating an existing doc over creating a new one. Only create a new doc when the topic is clearly distinct from all existing docs.
