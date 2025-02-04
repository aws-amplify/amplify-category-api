# Test Templates Directory

This directory is used by `numeric-validation-rules.test.ts` and `string-validation-rules.test.ts` to store temporary VTL templates and context files during test execution.

## Directory Structure

```
__templates__/
├── string-validation-evaluate-template/  # Templates for string validation evaluation tests
├── numeric-validation-evaluate-template/ # Templates for numeric validation evaluation tests
├── error-message-parsing/               # Templates for error message parsing tests
└── README.md
```

## Purpose

- `string-validation-evaluate-template/`: Stores templates for testing string validations (minLength, maxLength, startsWith, endsWith, matches)
- `numeric-validation-evaluate-template/`: Stores templates for testing numeric validations (gt, lt, gte, lte)
- `error-message-parsing/`: Stores templates for testing error message parsing with different quote types
- Each subdirectory contains temporary `.vtl` template files and `.json` context files for its respective tests

## How it Works

1. Before tests run, any existing `.vtl` and `.json` files are removed from the respective subdirectory.

2. During test execution:

   - Template files are generated with unique names (e.g., `template_gt_0.vtl`)
   - Context files are created with test data (e.g., `context_gt_0.json`)
   - AWS AppSync's `evaluate-mapping-template` command evaluates these files

3. After tests complete, all generated files are cleaned up from their respective directories.

## File Naming Convention

- VTL Templates: `template_${operator}_${testId}.vtl`

  - `operator`: The validation operator being tested
    - String operators: minLength, maxLength, startsWith, endsWith, matches
    - Numeric operators: gt, lt, gte, lte
  - `testId`: A unique identifier for the test case

- Context Files: `context_${operator}_${testId}.json`
  - Contains the test input data and context information
  - Matches the corresponding template file

## Example Files

String validation files (in `string-validation-evaluate-template/`):

```
template_minLength_0.vtl    // Template for first minimum length test
context_minLength_0.json    // Context for first minimum length test
template_matches_1.vtl      // Template for second regex match test
context_matches_1.json      // Context for second regex match test
```

Numeric validation files (in `numeric-validation-evaluate-template/`):

```
template_gt_0.vtl          // Template for first greater-than test
context_gt_0.json         // Context for first greater-than test
template_lte_1.vtl        // Template for second less-than-or-equal test
context_lte_1.json        // Context for second less-than-or-equal test
```

Error message parsing files (in `error-message-parsing/`):

```
template_minLength_0.vtl   // Template for testing single quotes
context_minLength_0.json   // Context for testing single quotes
template_minLength_1.vtl   // Template for testing double quotes
context_minLength_1.json   // Context for testing double quotes
```

Note: These files are temporary and should not be committed. The directories should remain empty except for this README.
