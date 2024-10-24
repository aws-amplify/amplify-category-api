#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack, Duration } from 'aws-cdk-lib';
import { Vpc, IpAddresses } from 'aws-cdk-lib/aws-ec2';
// @ts-ignore
import { AmplifyDatabase } from '@aws-amplify/database-construct';

const packageJson = require('../package.json');

const app = new App();
const stack = new Stack(app, packageJson.name.replace(/_/g, '-'), {
  env: { region: process.env.CLI_REGION || 'us-west-2' },
});

const vpc = new Vpc(stack, 'TestVPC', {
  ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
});

new AmplifyDatabase(stack, 'DatabaseCluster', {
  dbType: 'POSTGRES',
  vpc,
});
