# Auth transformer combination tests

The purpose of these tests is to give early warning of unexpected changes in
the transformer chain. We use two strategies for this:

1. Simply assert that the transformer completes without an error
   (`expect(testTransform(configToTest)).isDefined()`)
2. Comparing snapshots of the transformer output

Option 1 is always active. Option 2 is enabled by setting the environment
variable `USE_COMBINATION_SNAPSHOTS`.

NOTE: These tests use fake timers to fix the system time returned by `Date.now`
and other calls. Any routines that rely on time to actually pass will fail. As
of this writing, this works as expected, but be aware of the behavior.

## Using snapshots

These don't actually do much in the way of testing functionality, but rather
act as smoke tests to make sure we are alerted as early as possible to changes
in the generated resolver code and stack resources.

The snapshot option exists as a developer tool to gain confidence in your
changes prior to running E2E tests (which ultimately will test the full system
behavior). The full combination snapshot should not be committed to the
codebase, since 1/ it is a huge file; and 2/ it is subject to false negatives
for innocuous changes that are verified elsewhere.

To enable snapshot tests:

```bash
# Set the baseline snapshots
git checkout main
git pull
yarn build
cd packages/amplify-graphql-auth-transformer
USE_COMBINATION_SNAPSHOTS=1 yarn test combination-tests

# Test the changes by comparing them against the baseline snapshots
git checkout <branch with changes to be tested>
USE_COMBINATION_SNAPSHOTS=1 yarn test combination-tests
```

## What do do when a snapshot test fails

Because these tests cover such a broad surface area of the product, it is
expected that they will fail as resources or resolver code is generated in new
ways due to perfectly valid code changes. If a snapshot fails:

1. Review the diff and ensure that the change is valid and expected. Pay
   attention to the scope of the snapshot diff. Does it introduce changes in
   places you weren't expecting? If so, that might represent a side effect you
   hadn't considered when you were writing the new code.
2. Once you've adjusted your code to ensure the snapshot diff is expected,
   regenerate the snapshot file. The easiest way to do this is to delete it and
   re-run the test.

## Including snapshot diffs in a PR

The generated snapshot files are currently quite large, and thus not suitable
for including in the codebase. If the diff is small enough, the PR
author can identify the changes in a PR comment by simply pasting the diff.
Otherwise, PR authors can provide a sample diff and an explanation of how they
used the snapshot to verify the change.

## Writing a new snapshot test

We use these tests to smoke-test transformer behavior, so they are by design
broadly scoped and exercise multiple combinations of input parameters. When you
are writing a new snapshot test, here are a few points to keep in mind:

- Review [Jest's
  documentation](https://jestjs.io/docs/snapshot-testing#best-practices) for
  snapshot testing best practices
- Specifically: "Tests should be deterministic". The transformer chain has a
  few places where outputs vary according to local environment:
  - Some resources use a timestamped physical ID to ensure they are regenerated
    during each deploy. The fix for this is to fix the system time in your
    snapshot test:
    ```ts
    const fakeDate = Date.UTC(2024, 0, 1, 0, 0, 0);
    jest.useFakeTimers('modern');
    jest.setSystemTime(fakeDate);
    ```
  - Some resources use local filesystem paths. If these are not important to
    assert on, consider removing them from the object before generating a
    snapshot from it. If they are important, either scope the snapshot to not
    include the local filesystem path, or use a [property
    matcher](https://jestjs.io/docs/snapshot-testing#property-matchers).
