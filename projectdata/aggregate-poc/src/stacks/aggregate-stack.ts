/* eslint-disable */
import { Duration, RemovalPolicy, Stack, StackProps, Token } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import * as path from 'path';
import * as eventbridge from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { MappingTemplate } from '@aws-cdk/aws-appsync-alpha';

/**
 * Helpers to compute resource files into cdk objects.
 */
const getResourcePath = (resourceType: string, resourceName: string) => path.join(__dirname, '..', '..', 'resources', resourceType, resourceName);
const getMappingTemplate = (fileName: string): appsync.MappingTemplate => appsync.MappingTemplate.fromFile(getResourcePath('resolver', fileName));
const getSchema = (fileName: string): appsync.Schema => appsync.Schema.fromAsset(getResourcePath('schema', fileName));
const getLambdaCode = (lambdaName: string): any => lambda.Code.fromAsset(getResourcePath('lambda', `${lambdaName}.lambda.zip`));
/**
 * AggregateStack vends an AppSync API, which can store and compute aggregates over a set of known queries.
 */
export class AggregateStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create AppSync API
    const api = new appsync.GraphqlApi(this, 'MoviesApi', {
      name: 'movies',
      schema: getSchema('schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: { authorizationType: appsync.AuthorizationType.API_KEY },
      },
      xrayEnabled: true,
    });

    // Create DDB Table for storing Movies
    const moviesTable = new dynamodb.Table(this, 'MoviesTable', {
      partitionKey: { name: 'year', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'title', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create DDB Table for storing Aggregates
    const aggregatesTable = new dynamodb.Table(this, 'AggregatesTable', {
      partitionKey: { name: 'model', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'queryExpression', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create Lambda for computing/updating Aggregates
    const computeAggregatesFunction = new lambda.Function(this, 'ComputeAggregates', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: getLambdaCode('computeAggregates'),
      handler: 'index.handler',
      environment: {
        AGGREGATES_TABLE_NAME: aggregatesTable.tableName,
        MOVIES_TABLE_NAME: moviesTable.tableName,
      },
      timeout: Duration.seconds(10),
      tracing: lambda.Tracing.ACTIVE,
    });

    const aggregateSearchFunction = new lambda.Function(this, 'AggregateSearch', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: getLambdaCode('aggregateSearch'),
      handler: 'index.handler',
      timeout: Duration.seconds(10),
      tracing: lambda.Tracing.ACTIVE,
    });

    // Generate Lambdas for populating and querying mock data
    const generateMockDataFunction = new lambda.Function(this, 'GenerateMockData', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: getLambdaCode('generateMockData'),
      handler: 'index.handler',
      environment: {
        MOVIES_TABLE_NAME: moviesTable.tableName,
      },
      timeout: Duration.minutes(15),
      tracing: lambda.Tracing.ACTIVE,
    });

    const benchmarkQueriesFunction = new lambda.Function(this, 'BenchmarkQueries', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: getLambdaCode('benchmarkQueries'),
      handler: 'index.handler',
      environment: {
        MOVIES_TABLE_NAME: moviesTable.tableName,
      },
      timeout: Duration.seconds(10),
      tracing: lambda.Tracing.ACTIVE,
    });

    // Generate EventBridge to connect things together
    const eventBus = new eventbridge.EventBus(this, 'AggregateEventBus');
    
    const triggerEventBus = new lambda.Function(this, 'TriggerBusEvent', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: getLambdaCode('eventBusDemo'),
      handler: 'index.trigger',
      environment: {
        EVENT_BUS_NAME: eventBus.eventBusName,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    eventBus.grantPutEventsTo(triggerEventBus);

    const respondToEventBus = new lambda.Function(this, 'RespondToEventBus', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: getLambdaCode('eventBusDemo'),
      handler: 'index.respond',
      environment: {
        EVENT_BUS_NAME: eventBus.eventBusName,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    const eventDlq = new sqs.Queue(this, 'RespondToEventBusDlq');

    new eventbridge.Rule(this, 'TriggerLambda', {
      eventPattern: { source: ['custom.myATMapp'] },
      targets: [new targets.LambdaFunction(respondToEventBus, {
        deadLetterQueue: eventDlq,
        retryAttempts: 3,
      })],
      eventBus,
    });

    // Generate Resolvers and DataSources to configure the API
    const moviesDataSource = api.addDynamoDbDataSource('MoviesDataSource', moviesTable);
    const aggregatesDataSource = api.addDynamoDbDataSource('AggregatesDataSource', aggregatesTable);
    const computeAggregatesDataSource = api.addLambdaDataSource('ComputeAggregatesDataSource', computeAggregatesFunction);
    const triggerEventDataSource = api.addLambdaDataSource('TriggereEventDataSource', triggerEventBus);
    const aggregateSearchDataSource = api.addLambdaDataSource('AggregateSearchDataSource', aggregateSearchFunction);
    
    moviesDataSource.createResolver({
      typeName: 'Query',
      fieldName: 'moviesByYearLetter',
      requestMappingTemplate: getMappingTemplate('moviesByYearLetter.req.vtl'),
      responseMappingTemplate: getMappingTemplate('moviesByYearLetter.res.vtl'),
    });

    aggregatesDataSource.createResolver({
      typeName: 'Query',
      fieldName: 'count_moviesByYearLetter',
      requestMappingTemplate: getMappingTemplate('count_moviesByYearLetter.req.vtl'),
      responseMappingTemplate: getMappingTemplate('count_moviesByYearLetter.res.vtl'),
    });

    aggregateSearchDataSource.createResolver({
      typeName: 'Query',
      fieldName: 'movieAggregateSearch',
      requestMappingTemplate: getMappingTemplate('movieAggregateSearch.req.vtl'),
      responseMappingTemplate: getMappingTemplate('movieAggregateSearch.res.vtl'),
    });

    api.createResolver({
      typeName: 'Mutation',
      fieldName: 'putMovie',
      pipelineConfig: [
        moviesDataSource.createFunction({
          name: 'PersistMovie',
          requestMappingTemplate: getMappingTemplate('putMovie.Function1.req.vtl'),
          responseMappingTemplate: getMappingTemplate('putMovie.Function1.res.vtl'),
        }),
        computeAggregatesDataSource.createFunction({
          name: 'ComputeAggregates',
          requestMappingTemplate: getMappingTemplate('putMovie.Function2.req.vtl'),
          responseMappingTemplate: getMappingTemplate('putMovie.Function2.res.vtl'),
        }),
      ],
      requestMappingTemplate: getMappingTemplate('putMovie.before.vtl'),
      responseMappingTemplate: getMappingTemplate('putMovie.after.vtl'),
    });

    triggerEventDataSource.createResolver({
      typeName: 'Mutation',
      fieldName: 'triggerEvent',
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });

    // Grant Access between components
    moviesTable.grantReadData(computeAggregatesFunction);
    moviesTable.grantReadData(computeAggregatesDataSource);
    moviesTable.grantReadWriteData(moviesDataSource);
    moviesTable.grantWriteData(generateMockDataFunction);
    moviesTable.grantReadData(benchmarkQueriesFunction);
    moviesTable.grantReadData(aggregateSearchFunction);
    aggregatesTable.grantReadWriteData(computeAggregatesFunction);
    aggregatesTable.grantReadWriteData(computeAggregatesDataSource);
    aggregatesTable.grantReadWriteData(aggregatesDataSource);
  }
}
