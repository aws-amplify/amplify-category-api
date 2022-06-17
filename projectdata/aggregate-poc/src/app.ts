#!/usr/bin/env node
/* eslint-disable */
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AggregateStack } from './stacks/aggregate-stack';
import { zipLambdas } from './utils/zip-lambda';

const generateApp = async () => {
  await zipLambdas();
  const app = new cdk.App();
  new AggregateStack(app, 'AggregateStack');
};

generateApp();
