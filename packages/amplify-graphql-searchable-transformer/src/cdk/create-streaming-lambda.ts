import { GraphQLAPIProvider, TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  EventSourceMapping, IFunction, LayerVersion, Runtime, StartingPosition,
} from '@aws-cdk/aws-lambda';
import {
  CfnParameter, Construct, Fn, Stack, Duration,
} from '@aws-cdk/core';
import {
  Effect, IRole, Policy, PolicyStatement, Role, ServicePrincipal,
} from '@aws-cdk/aws-iam';
import { ResourceConstants, SearchableResourceIDs } from 'graphql-transformer-common';
import {
  ObjectTypeDefinitionNode,
  TypeNode,
} from 'graphql';
import * as path from 'path';
import * as fs from 'fs';
import AdmZip from 'adm-zip';

const DATA_TYPE_SCHEMA_FILENAME = 'schema_datatypes.json';
const STREAMING_FUNCTION_FILENAME = 'python_streaming_function.py';
const STREAMING_LAMBDA_ZIP_FILENAME = 'streaming-lambda.zip';
interface AttributeTypes {
  [attribute: string]: string;
}
interface SchemaDataTypes {
  [modelName: string]: AttributeTypes;
}

const findNamedType = (typeNode: TypeNode) : string => {
  switch (typeNode.kind) {
    case 'NamedType':
      return typeNode.name.value;
    case 'ListType':
    case 'NonNullType':
      return findNamedType(typeNode.type);
    default:
      throw new Error(`Unknown type ${typeNode}`);
  }
};

const generateSchemaDataTypes = (searchableObjectTypeDefinitions: { node: ObjectTypeDefinitionNode; fieldName: string; }[]): void => {
  const schemaDataTypes: SchemaDataTypes = {};
  for (const def of searchableObjectTypeDefinitions) {
    const modelName = def.node.name.value.toLowerCase();

    const attributeTypes: AttributeTypes = {};
    def.node.fields?.forEach((f) => {
      attributeTypes[f.name.value] = findNamedType(f.type);
    });
    schemaDataTypes[modelName] = attributeTypes;
  }

  // Paths to export JSON file and lambda function script
  const libPath = path.join(__dirname, '..', '..', 'lib');
  const schemaPath = path.join(libPath, DATA_TYPE_SCHEMA_FILENAME);
  const streamingFunctionPath = path.join(libPath, STREAMING_FUNCTION_FILENAME);
  fs.writeFileSync(schemaPath, JSON.stringify(schemaDataTypes));

  // Zip the file
  const zip = new AdmZip();
  zip.addLocalFile(schemaPath);
  zip.addLocalFile(streamingFunctionPath);
  zip.writeZip(path.join(libPath, STREAMING_LAMBDA_ZIP_FILENAME));
};

export const createLambda = (
  stack: Stack,
  apiGraphql: GraphQLAPIProvider,
  parameterMap: Map<string, CfnParameter>,
  lambdaRole: IRole,
  endpoint: string,
  isProjectUsingDataStore: boolean,
  region: string,
  searchableObjectTypeDefinitions: { node: ObjectTypeDefinitionNode; fieldName: string }[],
): IFunction => {
  const { OpenSearchStreamingLambdaFunctionLogicalID } = ResourceConstants.RESOURCES;
  const { OpenSearchStreamingLambdaHandlerName, OpenSearchDebugStreamingLambda } = ResourceConstants.PARAMETERS;
  const enviroment: { [key: string]: string } = {
    OPENSEARCH_ENDPOINT: `https://${endpoint}`,
    OPENSEARCH_REGION: region,
    DEBUG: parameterMap.get(OpenSearchDebugStreamingLambda)!.valueAsString,
    OPENSEARCH_USE_EXTERNAL_VERSIONING: isProjectUsingDataStore.toString(),
  };

  generateSchemaDataTypes(searchableObjectTypeDefinitions);

  return apiGraphql.host.addLambdaFunction(
    OpenSearchStreamingLambdaFunctionLogicalID,
    `functions/${OpenSearchStreamingLambdaFunctionLogicalID}.zip`,
    parameterMap.get(OpenSearchStreamingLambdaHandlerName)!.valueAsString,
    path.resolve(__dirname, '..', '..', 'lib', STREAMING_LAMBDA_ZIP_FILENAME),
    Runtime.PYTHON_3_8,
    [
      LayerVersion.fromLayerVersionArn(
        stack,
        'LambdaLayerVersion',
        Fn.findInMap('LayerResourceMapping', Fn.ref('AWS::Region'), 'layerRegion'),
      ),
    ],
    lambdaRole,
    enviroment,
    undefined,
    stack,
  );
};

export const createLambdaRole = (context: TransformerContextProvider, stack: Construct, parameterMap: Map<string, CfnParameter>): IRole => {
  const { OpenSearchStreamingLambdaIAMRoleLogicalID } = ResourceConstants.RESOURCES;
  const { OpenSearchStreamingIAMRoleName } = ResourceConstants.PARAMETERS;
  const role = new Role(stack, OpenSearchStreamingLambdaIAMRoleLogicalID, {
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    roleName: context.resourceHelper.generateIAMRoleName(parameterMap.get(OpenSearchStreamingIAMRoleName)?.valueAsString ?? ''),
  });
  role.attachInlinePolicy(
    new Policy(stack, 'CloudwatchLogsAccess', {
      statements: [
        new PolicyStatement({
          actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
          effect: Effect.ALLOW,
          resources: ['arn:aws:logs:*:*:*'],
        }),
      ],
    }),
  );

  return role;
};

export const createEventSourceMapping = (
  stack: Construct,
  type: string,
  target: IFunction,
  parameterMap: Map<string, CfnParameter>,
  tableStreamArn: string,
): EventSourceMapping => {
  const { OpenSearchStreamBatchSize, OpenSearchStreamMaximumBatchingWindowInSeconds } = ResourceConstants.PARAMETERS;
  return new EventSourceMapping(stack, SearchableResourceIDs.SearchableEventSourceMappingID(type), {
    eventSourceArn: tableStreamArn,
    target,
    batchSize: parameterMap.get(OpenSearchStreamBatchSize)!.valueAsNumber,
    maxBatchingWindow: Duration.seconds(parameterMap.get(OpenSearchStreamMaximumBatchingWindowInSeconds)!.valueAsNumber),
    enabled: true,
    startingPosition: StartingPosition.LATEST,
  });
};
