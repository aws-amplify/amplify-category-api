import { Stack } from 'aws-cdk-lib';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { getResourceName, setResourceName } from '../../utils/resource-name';

describe('getResourceName', () => {
  let myResource: Construct;

  beforeEach(() => {
    const scope = new Stack();
    myResource = new Construct(scope, 'myResource');
  });

  it('returns a resource name if set', () => {
    setResourceName(myResource, { name: 'testName' });
    expect(getResourceName(myResource)).toEqual('testName');
  });

  it('returns undefined if no name is set', () => {
    expect(getResourceName(myResource)).toBeUndefined();
  });

  it('throws on multiple names set', () => {
    setResourceName(myResource, { name: 'testName1' });
    setResourceName(myResource, { name: 'testName2' });
    expect(() => getResourceName(myResource)).toThrowErrorMatchingInlineSnapshot(
      '"Multiple metadata entries specifying a resource name were found, expected 0 or 1."',
    );
  });

  it('sets on default child for L2 constructs when setOnDefaultChild enabled', () => {
    const myL2Resource = new Table(new Stack(), 'MyTable', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
    });
    setResourceName(myL2Resource, { name: 'testName1', setOnDefaultChild: true });
    expect(getResourceName(myL2Resource)).toEqual('testName1');
    expect(getResourceName(myL2Resource.node.defaultChild!)).toEqual('testName1');
  });

  it('does not set on default child for L2 constructs when setOnDefaultChild enabled', () => {
    const myL2Resource = new Table(new Stack(), 'MyTable', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
    });
    setResourceName(myL2Resource, { name: 'testName1', setOnDefaultChild: false });
    expect(getResourceName(myL2Resource)).toEqual('testName1');
    expect(getResourceName(myL2Resource.node.defaultChild!)).toBeUndefined();
  });
});
