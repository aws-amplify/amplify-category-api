import {
  FunctionSlot,
  IAmplifySqlBoundGraphqlApiDefinition,
  GraphqlApiDefinitionDbConnectionConfig,
  GraphqlApiDefinitionSupportedDbEngines,
  GraphqlApiDefinitionDbVpcConfig,
  AmplifySqlBoundGraphqlApiDefinitionProps,
} from './types';

/**
 * Concrete implementation of an AmplifyGraphqlDefinition bound to a single SQL database.
 */
export class AmplifySqlBoundGraphqlApiDefinition implements IAmplifySqlBoundGraphqlApiDefinition {
  customSqlStatements?: Record<string, string>;
  vpcConfig: GraphqlApiDefinitionDbVpcConfig;
  engineType: GraphqlApiDefinitionSupportedDbEngines;
  dbConnectionConfig: GraphqlApiDefinitionDbConnectionConfig;
  schema: string;
  functionSlots: FunctionSlot[];

  constructor(props: AmplifySqlBoundGraphqlApiDefinitionProps) {
    this.customSqlStatements = props.customSqlStatements;
    this.vpcConfig = props.vpcConfig;
    this.engineType = props.engineType;
    this.dbConnectionConfig = props.dbConnectionConfig;
    this.schema = props.schema;

    // NOTE: The Lambda resolver for models in this schema will not be mapped to functionSlots. It is created by the SQL transformer, and
    // applies to all models in the schema rather than a single field.
    this.functionSlots = [];
  }
}
