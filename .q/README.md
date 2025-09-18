# Q Workspace

This directory contains Amazon Q's working files for task management, design documentation, and context preservation.

## Structure

### `/tasks/`

Individual task files with detailed requirements, progress, and implementation notes.

- Format: `TASK-001-brief-description.md`
- Contains: Requirements, approach, progress, blockers

### `/designs/`

Design documents for complex features or architectural decisions.

- Format: `DESIGN-feature-name.md`
- Contains: Problem statement, options analysis, diagrams, decisions
- Uses Mermaid diagrams for GitHub compatibility

### `/context/`

Context snapshots for managing session boundaries.

- Format: `CONTEXT-YYYY-MM-DD-session-name.md`
- Contains: Current state, key decisions, handoff notes

## Usage Patterns

### Before Complex Tasks

1. Create design document in `/designs/`
2. Review with user before implementation
3. Break into discrete tasks in `/tasks/`

### Context Management

1. Save context snapshots before limits
2. Reference previous contexts when resuming
3. Update task files with progress

### Task Lifecycle

1. Create task file with requirements
2. Update with progress and decisions
3. Mark complete and archive learnings
