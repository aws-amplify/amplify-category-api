import { FieldLogLevel } from 'aws-cdk-lib/aws-appsync';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

// Reimporting and reexporting FieldLogLevel and RetentionDays to reduce the number of imports required to use logConfig.
export { FieldLogLevel, RetentionDays };

/**
 * Customizable logging configuration when writing GraphQL operations and tracing to Amazon CloudWatch for an AWS AppSync GraphQL API.
 *
 * **WARNING**: Verbose logging will log the full incoming query including user parameters.
 * Sensitive information may be exposed in CloudWatch logs. Ensure that your IAM policies only grant access to authorized users.
 *
 * For information on LogConfig, refer to https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-appsync-graphqlapi-logconfig.html.
 * For information on RetentionDays, refer to https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.RetentionDays.html.
 *
 * @default excludeVerboseContent: true, fieldLogLevel: FieldLogLevel.NONE, retention: RetentionDays.ONE_WEEK
 */
export interface LogConfig {
  /**
   * The number of days log events are kept in CloudWatch Logs.
   *
   * @default RetentionDays.ONE_WEEK
   * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.RetentionDays.html
   */
  readonly retention?: RetentionDays;

  /**
   * When set to `true`, excludes verbose information from the logs, such as:
   * - GraphQL Query
   * - Request Headers
   * - Response Headers
   * - Context
   * - Evaluated Mapping Templates
   *
   * This setting applies regardless of the specified logging level.
   *
   * **WARNING**: Verbose logging will log the full incoming query including user parameters.
   * Sensitive information may be exposed in CloudWatch logs. Ensure that your IAM policies only grant access to authorized users.
   *
   * @default true
   */
  readonly excludeVerboseContent?: boolean;

  /**
   * The field logging level. Values can be `NONE`, `ERROR`, `INFO`, `DEBUG`, or `ALL`.
   *
   * - **NONE**: No field-level logs are captured.
   * - **ERROR**: Logs the following information only for the fields that are in the error category:
   *   - The error section in the server response.
   *   - Field-level errors.
   *   - The generated request/response functions that got resolved for error fields.
   * - **INFO**: Logs the following information only for the fields that are in the info and error categories:
   *   - Info-level messages.
   *   - The user messages sent through `$util.log.info` and `console.log`.
   *   - Field-level tracing and mapping logs are not shown.
   * - **DEBUG**: Logs the following information only for the fields that are in the debug, info, and error categories:
   *   - Debug-level messages.
   *   - The user messages sent through `$util.log.info`, `$util.log.debug`, `console.log`, and `console.debug`.
   *   - Field-level tracing and mapping logs are not shown.
   * - **ALL**: The following information is logged for all fields in the query:
   *   - Field-level tracing information.
   *   - The generated request/response functions that were resolved for each field.
   *
   * @default FieldLogLevel.NONE
   */
  readonly fieldLogLevel?: FieldLogLevel;
}

/**
 * The logging configuration when writing GraphQL operations and tracing to Amazon CloudWatch for an AWS AppSync GraphQL API.
 * Values can be `true` or a `LogConfig` object.
 *
 * ### Defaults
 * Default settings will be applied when logging is set to `true` or an empty object, or for unspecified fields:
 * - `excludeVerboseContent`: `true`
 * - `fieldLogLevel`: `FieldLogLevel.NONE`
 * - `retention`: `RetentionDays.ONE_WEEK`
 *
 * **WARNING**: Verbose logging will log the full incoming query including user parameters.
 * Sensitive information may be exposed in CloudWatch logs. Ensure that your IAM policies only grant access to authorized users.
 *
 * For information on LogConfig, refer to https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-appsync-graphqlapi-logconfig.html.
 */
export type Logging = true | LogConfig;
