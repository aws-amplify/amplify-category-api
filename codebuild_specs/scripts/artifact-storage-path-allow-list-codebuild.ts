/**
 * Codebuild allows you to store test results & artifacts after each job,
 * but we need to scan those results/artifacts before we upload those files.
 *
 * You must register all paths where artifacts will be stored, using $CODEBUILD_SRC_DIR as the root folder.
 *
 * For example:
 * In run_e2e_tests.yml, we have the following steps:
 *
    artifacts:
      files:
        - $CODEBUILD_SRC_DIR/packages/amplify-e2e-tests/amplify-e2e-reports/*
 *
 * From the above job, 'path' includes the following:
 *  $CODEBUILD_SRC_DIR/packages/amplify-e2e-tests/amplify-e2e-reports
 *
 * Those paths must be included in this list.
 *
 * This ensures that we will scan all of these directories before uploading any files.
 *
 * If you try to upload artifacts from a directory that is not listed below, your build
 * will not execute, and you'll be prompted to update this list.
 *
 * NOTE: Make sure to use '$CODEBUILD_SRC_DIR' as the first segment in your paths,
 * this allows for path resolution in both linux & windows machines.
 * You do not need to include pathing for Windows, as the scanning script
 * will automatically normalize these paths for Windows if it detects it.
 */
export const ARTIFACT_STORAGE_PATH_ALLOW_LIST_CODEBUILD = [
  '$CODEBUILD_SRC_DIR/packages/amplify-util-mock/',
  '$CODEBUILD_SRC_DIR/packages/graphql-transformers-e2e-tests/',
  '$CODEBUILD_SRC_DIR/packages/amplify-e2e-tests/',
  '$CODEBUILD_SRC_DIR/packages/amplify-e2e-tests/amplify-e2e-reports',
  '$CODEBUILD_SRC_DIR/client-test-apps/js/api-model-relationship-app/test-results',
  '$CODEBUILD_SRC_DIR/client-test-apps/js/api-model-relationship-app/cypress/screenshots',
  '$CODEBUILD_SRC_DIR/client-test-apps/js/api-model-relationship-app/cypress/videos',
];
