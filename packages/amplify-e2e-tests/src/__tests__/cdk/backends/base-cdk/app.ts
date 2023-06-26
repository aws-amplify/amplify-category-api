#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { BackendStack } from './stacks/backend-stack';

const packageJson = require('../package.json');

const app = new App();
const env = { region: process.env.CLI_REGION || 'us-west-2' };

new BackendStack(app, packageJson.name.replace(/_/g, '-'), { env });
