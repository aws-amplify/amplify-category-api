# Test Templates Directory

The git ignored `__templates__` directory is used by `validate-transformer-evaluate-mapping-template.test.ts` to store temporary VTL 
templates and context files during test execution.

## Directory Structure

> **Note**: The subdirectories mentioned below may not be visible in Git as they are empty directories.
> These directories are automatically created and cleaned up during test execution.

```
__templates__/
├── complex-validation/                  # Templates for complex validation scenarios
├── error-message-parsing/               # Templates for error message parsing tests
├── numeric-validation/                  # Templates for numeric validation tests
├── string-validation/                   # Templates for string validation tests
├── string-validation-threshold-parsing/ # Templates for string validation threshold parsing tests
└── README.md
```

## Purpose

- `complex-validation/`: Stores templates for testing multiple validations per field and multiple fields per type
- `error-message-parsing/`: Stores templates for testing error message parsing with different quote types
- `numeric-validation/`: Stores templates for testing numeric validations (gt, lt, gte, lte)
- `string-validation/`: Stores templates for testing string validations (minLength, maxLength, startsWith, endsWith, matches)
- `string-validation-threshold-parsing/`: Stores templates for testing string validation thresholds with various quote combinations
- Each subdirectory contains temporary `.vtl` template files and `.json` context files for its respective tests

## How it Works

1. Before tests run, any existing `.vtl` and `.json` files are removed from the respective subdirectory.

2. During test execution:

   - Template files are generated with unique names (e.g., `template_gt_0.vtl`)
   - Context files are created with test data (e.g., `context_gt_0.json`)
   - AWS AppSync's `EvaluateMappingTemplateCommand` evaluates these files

3. After tests complete, all generated files are cleaned up from their respective directories.

## File Naming Convention

- VTL Templates: `template_${operator}_${testId}.vtl` or `template_${testId}.vtl`

  - `operator`: The validation operator being tested (when applicable)
    - String operators: minLength, maxLength, startsWith, endsWith, matches
    - Numeric operators: gt, lt, gte, lte
  - `testId`: A unique identifier for the test case

- Context Files: `context_${operator}_${testId}.json` or `context_${testId}.json`
  - Contains the test input data and context information
  - Matches the corresponding template file

## Example Files

String validation files (in `string-validation/`):

```
template_minLength_0.vtl    // Template for first minimum length test
context_minLength_0.json    // Context for first minimum length test
template_matches_1.vtl      // Template for second regex match test
context_matches_1.json      // Context for second regex match test
```

Note: These files are temporary and should not be committed. The directories should remain empty except for this README.
