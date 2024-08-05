import { print } from 'graphql-mapping-template';
import { generateAddAggregateValues, postAuthMappingTemplate, requestTemplate, responseTemplate } from '../generate-resolver-vtl';

describe('sandboxMappingTemplate', () => {
  it('renders when sandbox is enabled and iam access disabled', () => {
    expect(postAuthMappingTemplate(true, false, ['id', 'content'])).toMatchSnapshot();
  });

  it('renders when sandbox is disabled and iam access disabled', () => {
    expect(postAuthMappingTemplate(false, false, ['id', 'content'])).toMatchSnapshot();
  });

  it('renders when sandbox is enabled and iam access enabled', () => {
    expect(postAuthMappingTemplate(true, true, ['id', 'content'])).toMatchSnapshot();
  });

  it('renders when sandbox is disabled and iam access enabled', () => {
    expect(postAuthMappingTemplate(false, true, ['id', 'content'])).toMatchSnapshot();
  });
});

describe('generateAddAggregateValues', () => {
  it('renders', () => {
    expect(print(generateAddAggregateValues())).toMatchSnapshot();
  });
});

describe('requestTemplate', () => {
  it('renders with simple id pk and version is disabled', () => {
    expect(requestTemplate('id', [], false, 'byId')).toMatchSnapshot();
  });

  it('renders with simple id pk and version is enabled', () => {
    expect(requestTemplate('id', [], true, 'byId')).toMatchSnapshot();
  });

  it('renders with simple id pk and version is undefined', () => {
    expect(requestTemplate('id', [], undefined, 'byId')).toMatchSnapshot();
  });
});

describe('responseTemplate', () => {
  it('generates when version is enabled', () => {
    expect(responseTemplate(true)).toMatchSnapshot();
  });

  it('generates when version is disabled', () => {
    expect(responseTemplate(false)).toMatchSnapshot();
  });

  it('generates when version is undefined', () => {
    expect(responseTemplate()).toMatchSnapshot();
  });
});
