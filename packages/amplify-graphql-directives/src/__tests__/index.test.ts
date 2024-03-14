import { parse } from 'graphql';
import {
  AuthDirective,
  AwsApiKeyDirective,
  AwsAuthDirective,
  AwsCognitoUserPoolsDirective,
  AwsIamDirective,
  AwsLambdaDirective,
  AwsOidcDirective,
  AwsSubscribeDirective,
  BelongsToDirective,
  DefaultDirective,
  DeprecatedDirective,
  FunctionDirective,
  HasManyDirective,
  HasOneDirective,
  HttpDirective,
  IndexDirective,
  ManyToManyDirective,
  MapsToDirective,
  ModelDirective,
  PredictionsDirective,
  PrimaryKeyDirective,
  RefersToDirective,
  SearchableDirective,
  SqlDirective,
} from '..';

describe('Directive Definitions', () => {
  test.each([
    ['AuthDirective', AuthDirective],
    ['AwsApiKeyDirective', AwsApiKeyDirective],
    ['AwsAuthDirective', AwsAuthDirective],
    ['AwsCognitoUserPoolsDirective', AwsCognitoUserPoolsDirective],
    ['AwsIamDirective', AwsIamDirective],
    ['AwsLambdaDirective', AwsLambdaDirective],
    ['AwsOidcDirective', AwsOidcDirective],
    ['AwsSubscribeDirective', AwsSubscribeDirective],
    ['BelongsToDirective', BelongsToDirective],
    ['DefaultDirective', DefaultDirective],
    ['DeprecatedDirective', DeprecatedDirective],
    ['FunctionDirective', FunctionDirective],
    ['HasManyDirective', HasManyDirective],
    ['HasOneDirective', HasOneDirective],
    ['HttpDirective', HttpDirective],
    ['IndexDirective', IndexDirective],
    ['ManyToManyDirective', ManyToManyDirective],
    ['MapsToDirective', MapsToDirective],
    ['ModelDirective', ModelDirective],
    ['PredictionsDirective', PredictionsDirective],
    ['PrimaryKeyDirective', PrimaryKeyDirective],
    ['RefersToDirective', RefersToDirective],
    ['SearchableDirective', SearchableDirective],
    ['SqlDirective', SqlDirective],
  ])('%s', (_, directive) => {
    // assert valid graphql syntax
    expect(() => parse(directive.definition)).not.toThrow();

    // assert no changes to directive
    expect(directive).toMatchSnapshot();
  });

  test('no negative interactions', () => {
    const directives = [
      AuthDirective,
      AwsApiKeyDirective,
      AwsAuthDirective,
      AwsCognitoUserPoolsDirective,
      AwsIamDirective,
      AwsLambdaDirective,
      AwsOidcDirective,
      AwsSubscribeDirective,
      BelongsToDirective,
      DefaultDirective,
      DeprecatedDirective,
      FunctionDirective,
      HasManyDirective,
      HasOneDirective,
      HttpDirective,
      IndexDirective,
      ManyToManyDirective,
      MapsToDirective,
      ModelDirective,
      PredictionsDirective,
      PrimaryKeyDirective,
      RefersToDirective,
      SearchableDirective,
      SqlDirective,
    ]
      .map((directive) => directive.definition)
      .join('\n');

    // asserts directives can be parsed together
    expect(() => parse(directives)).not.toThrow();
  });
});
