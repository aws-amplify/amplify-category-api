/* eslint-disable spellcheck/spell-checker, camelcase, jsdoc/require-jsdoc, @typescript-eslint/no-explicit-any */
import path from 'path';
import { config } from 'dotenv';
import yargs from 'yargs';
import _ from 'lodash';
import * as fs from 'fs-extra';
import { deleteS3Bucket, sleep } from 'amplify-category-api-e2e-core';
import { S3Client, ListBucketsCommand, GetBucketLocationCommand, GetBucketTaggingCommand, Bucket } from '@aws-sdk/client-s3';
import {
  IAMClient,
  ListRolesCommand,
  ListAttachedRolePoliciesCommand,
  ListRolePoliciesCommand,
  DeleteRoleCommand,
  DetachRolePolicyCommand,
  DeleteRolePolicyCommand,
  Role,
  AttachedPolicy,
} from '@aws-sdk/client-iam';
import { RDSClient, DescribeDBInstancesCommand, DeleteDBInstanceCommand, DBInstance } from '@aws-sdk/client-rds';
import {
  CloudFormationClient,
  DescribeStacksCommand,
  ListStackResourcesCommand,
  ListStacksCommand,
  DeleteStackCommand,
  Tag as CFNTag,
  waitUntilStackDeleteComplete,
  Stack,
  StackResourceSummary,
  StackStatus,
  StackSummary,
  ResourceStatus,
} from '@aws-sdk/client-cloudformation';
import {
  AmplifyClient,
  App,
  DeleteAppCommand,
  ListAppsCommand,
  ListAppsCommandOutput,
  ListBackendEnvironmentsCommand,
} from '@aws-sdk/client-amplify';
import { BatchGetBuildsCommand, Build, CodeBuildClient } from '@aws-sdk/client-codebuild';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { OrganizationsClient, ListAccountsCommand } from '@aws-sdk/client-organizations';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { appendAmplifyInput } from './rds-v2-test-utils';
import { ConfiguredRetryStrategy } from '@smithy/util-retry';
import { paginate } from './utils/retries';

type TestRegion = {
  name: string;
  optIn: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

const repoRoot = path.join(__dirname, '..', '..', '..');
const supportedRegionsPath = path.join(repoRoot, 'scripts', 'e2e-test-regions.json');
const suportedRegions: TestRegion[] = JSON.parse(fs.readFileSync(supportedRegionsPath, 'utf-8'));
const testRegions = suportedRegions.filter((region) => !(region as any).disabled).map((region) => region.name);

const retryStrategy = new ConfiguredRetryStrategy(
  10, // max attempts.
  (attempt: number) => Math.floor(Math.random() * 2 ** attempt * 100),
);

const reportPathDir = path.normalize(path.join(__dirname, '..', 'amplify-e2e-reports'));

const MULTI_JOB_APP = '<Amplify App reused by multiple apps>';
const ORPHAN = '<orphan>';
const UNKNOWN = '<unknown>';

type StackInfo = {
  stackId: string;
  stackName: string;
  stackStatus: string;
  resourcesFailedToDelete?: string[];
  tags: Record<string, string>;
  region: string;
  jobId: string;
  cbInfo?: Build;
};

type AmplifyAppInfo = {
  appId: string;
  name: string;
  region: string;
  backends: Record<string, StackInfo>;
};

type S3BucketInfo = {
  name: string;
  jobId?: string;
  region: string;
  cbInfo?: Build;
};

type IamRoleInfo = {
  name: string;
  cbInfo?: Build;
};
