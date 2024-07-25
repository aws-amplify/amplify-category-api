import { Kind, DocumentNode, parse, SchemaDefinitionNode } from 'graphql/language';
import { validate, ValidationRule } from 'graphql/validation';
import { buildASTSchema } from 'graphql/utilities/buildASTSchema';

// Spec Section: "Subscriptions with Single Root Field"
import { SingleFieldSubscriptionsRule } from 'graphql/validation/rules/SingleFieldSubscriptionsRule';

// Spec Section: "Fragment Spread Type Existence"
import { KnownTypeNamesRule } from 'graphql/validation/rules/KnownTypeNamesRule';

// Spec Section: "Fragments on Composite Types"
import { FragmentsOnCompositeTypesRule } from 'graphql/validation/rules/FragmentsOnCompositeTypesRule';

// Spec Section: "Variables are Input Types"
import { VariablesAreInputTypesRule } from 'graphql/validation/rules/VariablesAreInputTypesRule';

// Spec Section: "Leaf Field Selections"
import { ScalarLeafsRule } from 'graphql/validation/rules/ScalarLeafsRule';

// Spec Section: "Field Selections on Objects, Interfaces, and Unions Types"
import { FieldsOnCorrectTypeRule } from 'graphql/validation/rules/FieldsOnCorrectTypeRule';

// Spec Section: "Directives Are Defined"
import { KnownDirectivesRule } from 'graphql/validation/rules/KnownDirectivesRule';

// Spec Section: "Argument Names"
import { KnownArgumentNamesRule } from 'graphql/validation/rules/KnownArgumentNamesRule';

// Spec Section: "Argument Uniqueness"
import { UniqueArgumentNamesRule } from 'graphql/validation/rules/UniqueArgumentNamesRule';

// Spec Section: "Value Type Correctness"
import { ValuesOfCorrectTypeRule } from 'graphql/validation/rules/ValuesOfCorrectTypeRule';

// Spec Section: "All Variable Usages Are Allowed"
import { VariablesInAllowedPositionRule } from 'graphql/validation/rules/VariablesInAllowedPositionRule';

// Spec Section: "Field Selection Merging"
import { OverlappingFieldsCanBeMergedRule } from 'graphql/validation/rules/OverlappingFieldsCanBeMergedRule';

// Spec Section: "Input Object Field Uniqueness"
import { UniqueInputFieldNamesRule } from 'graphql/validation/rules/UniqueInputFieldNamesRule';

import { ProvidedRequiredArgumentsRule } from 'graphql/validation/rules/ProvidedRequiredArgumentsRule';
import { UniqueOperationNamesRule } from 'graphql/validation/rules/UniqueOperationNamesRule';
import { LoneAnonymousOperationRule } from 'graphql/validation/rules/LoneAnonymousOperationRule';
import { UniqueFragmentNamesRule } from 'graphql/validation/rules/UniqueFragmentNamesRule';
import { KnownFragmentNamesRule } from 'graphql/validation/rules/KnownFragmentNamesRule';
import { NoUnusedFragmentsRule } from 'graphql/validation/rules/NoUnusedFragmentsRule';
import { PossibleFragmentSpreadsRule } from 'graphql/validation/rules/PossibleFragmentSpreadsRule';
import { NoFragmentCyclesRule } from 'graphql/validation/rules/NoFragmentCyclesRule';
import { UniqueVariableNamesRule } from 'graphql/validation/rules/UniqueVariableNamesRule';
import { NoUndefinedVariablesRule } from 'graphql/validation/rules/NoUndefinedVariablesRule';
import { NoUnusedVariablesRule } from 'graphql/validation/rules/NoUnusedVariablesRule';
import { UniqueDirectivesPerLocationRule } from 'graphql/validation/rules/UniqueDirectivesPerLocationRule';

// AuthMode Types
import { AppSyncAuthConfiguration, AppSyncAuthMode } from '@aws-amplify/graphql-transformer-interfaces';
import { validateSDL } from 'graphql/validation/validate';
import {
  AwsSubscribeDirective,
  AwsAuthDirective,
  AwsApiKeyDirective,
  AwsIamDirective,
  AwsOidcDirective,
  AwsCognitoUserPoolsDirective,
  AwsLambdaDirective,
  DeprecatedDirective,
} from '@aws-amplify/graphql-directives';

/**
 * This set includes all validation rules defined by the GraphQL spec.
 *
 * The order of the rules in this list has been adjusted to lead to the
 * most clear output when encountering multiple validation errors.
 */
export const specifiedRules: Readonly<ValidationRule[]> = [
  UniqueOperationNamesRule,
  LoneAnonymousOperationRule,
  SingleFieldSubscriptionsRule,
  KnownTypeNamesRule,
  FragmentsOnCompositeTypesRule,
  VariablesAreInputTypesRule,
  ScalarLeafsRule,
  FieldsOnCorrectTypeRule,
  UniqueFragmentNamesRule,
  KnownFragmentNamesRule,
  NoUnusedFragmentsRule,
  PossibleFragmentSpreadsRule,
  NoFragmentCyclesRule,
  UniqueVariableNamesRule,
  NoUndefinedVariablesRule,
  NoUnusedVariablesRule,
  KnownDirectivesRule,
  UniqueDirectivesPerLocationRule,
  KnownArgumentNamesRule,
  UniqueArgumentNamesRule,
  ValuesOfCorrectTypeRule,
  ProvidedRequiredArgumentsRule,
  VariablesInAllowedPositionRule,
  OverlappingFieldsCanBeMergedRule,
  UniqueInputFieldNamesRule,
];

const EXTRA_SCALARS_DOCUMENT = parse(`
scalar AWSDate
scalar AWSTime
scalar AWSDateTime
scalar AWSTimestamp
scalar AWSEmail
scalar AWSJSON
scalar AWSURL
scalar AWSPhone
scalar AWSIPAddress
scalar BigInt
scalar Double
`);

export const EXTRA_DIRECTIVES_DOCUMENT = parse(
  [
    AwsSubscribeDirective.definition,
    AwsAuthDirective.definition,
    AwsApiKeyDirective.definition,
    AwsIamDirective.definition,
    AwsOidcDirective.definition,
    AwsCognitoUserPoolsDirective.definition,
    AwsLambdaDirective.definition,
    DeprecatedDirective.definition,
  ].join('\n'),
);

// As query type is mandatory in the schema we've to append a dummy one if it is not present
const NOOP_QUERY = parse(`
type Query {
  noop: String
}
`);

export const validateModelSchema = (doc: DocumentNode) => {
  const fullDocument = {
    kind: Kind.DOCUMENT,
    definitions: [...EXTRA_DIRECTIVES_DOCUMENT.definitions, ...doc.definitions, ...EXTRA_SCALARS_DOCUMENT.definitions],
  };

  const schemaDef = doc.definitions.find((d) => d.kind === Kind.SCHEMA_DEFINITION) as SchemaDefinitionNode;
  const queryOperation = schemaDef ? schemaDef.operationTypes.find((o) => o.operation === 'query') : undefined;
  const queryName = queryOperation ? queryOperation.type.name.value : 'Query';
  const existingQueryType = doc.definitions.find(
    (d) =>
      d.kind !== Kind.DIRECTIVE_DEFINITION && d.kind !== Kind.SCHEMA_DEFINITION && (d as any).name && (d as any).name.value === queryName,
  );

  if (!existingQueryType) {
    fullDocument.definitions.push(...NOOP_QUERY.definitions);
  }
  let schema;
  const errors = validateSDL(fullDocument);
  if (errors.length > 0) {
    return errors;
  }
  schema = buildASTSchema(fullDocument, { assumeValid: true });
  return validate(schema, fullDocument, specifiedRules);
};

export const validateAuthModes = (authConfig: AppSyncAuthConfiguration) => {
  let additionalAuthModes: AppSyncAuthMode[] = [];

  if (authConfig.additionalAuthenticationProviders) {
    additionalAuthModes = authConfig.additionalAuthenticationProviders.map((p) => p.authenticationType).filter((t) => !!t);
  }

  const authModes: AppSyncAuthMode[] = [...additionalAuthModes, authConfig.defaultAuthentication.authenticationType];

  for (let i = 0; i < authModes.length; i++) {
    const mode = authModes[i];

    if (
      mode !== 'API_KEY' &&
      mode !== 'AMAZON_COGNITO_USER_POOLS' &&
      mode !== 'AWS_IAM' &&
      mode !== 'OPENID_CONNECT' &&
      mode !== 'AWS_LAMBDA'
    ) {
      throw new Error(`Invalid auth mode ${mode}`);
    }
  }
};
