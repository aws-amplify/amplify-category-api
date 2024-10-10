import { FieldLogLevel } from 'aws-cdk-lib/aws-appsync';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

export interface LogConfig {
  excludeVerboseContent?: boolean;
  fieldLogLevel?: FieldLogLevel;
  retention?: RetentionDays;
}
