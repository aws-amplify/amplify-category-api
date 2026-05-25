import Output from 'cloudform-types/types/output';
import Template from 'cloudform-types/types/template';
import { StringParameter, NumberParameter } from 'cloudform-types';
import { Expression } from 'graphql-mapping-template';
import { MappingParameters } from 'graphql-transformer-core';
export declare class ResourceFactory {
    makeParams(): {
        [x: string]: StringParameter | NumberParameter;
    };
    initTemplate(isProjectUsingDataStore?: boolean): Template;
    makeElasticsearchDataSource(): import("cloudform-types/types/appSync/dataSource").default;
    getLayerMapping(): MappingParameters;
    makeDynamoDBStreamingFunction(isProjectUsingDataStore?: boolean): import("cloudform-types/types/lambda/function").default;
    makeDynamoDBStreamEventSourceMapping(typeName: string): import("cloudform-types/types/lambda/eventSourceMapping").default;
    private joinWithEnv;
    makeElasticsearchAccessIAMRole(): import("cloudform-types/types/iam/role").default;
    makeStreamingLambdaIAMRole(): import("cloudform-types/types/iam/role").default;
    private domainName;
    private domainArn;
    makeElasticsearchDomain(): import("cloudform-types/types/elasticsearch/domain").default;
    makeSearchResolver(type: string, nonKeywordFields: Expression[], primaryKey: string, queryTypeName: string, improvePluralization: boolean, nameOverride?: string, includeVersion?: boolean): import("cloudform-types/types/appSync/resolver").default;
    private getSourceMapper;
    makeDomainArnOutput(): Output;
    makeDomainEndpointOutput(): Output;
}
//# sourceMappingURL=resources.d.ts.map