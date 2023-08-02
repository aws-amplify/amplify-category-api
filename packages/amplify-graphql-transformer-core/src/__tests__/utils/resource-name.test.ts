import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { setResourceName, getResourceName } from '../../utils/resource-name';

describe('getResourceName', () => {
  let myResource: Construct;

  beforeEach(() => {
    const scope = new Stack();
    myResource = new Construct(scope, 'myResource');
  });

  it('returns a resource name if set', () => {
    setResourceName(myResource, 'testName');
    expect(getResourceName(myResource)).toEqual('testName');
  });

  it('returns undefined if no name is set', () => {
    expect(getResourceName(myResource)).toBeUndefined();
  });

  it('throws on multiple names set', () => {
    setResourceName(myResource, 'testName1');
    setResourceName(myResource, 'testName2');
    expect(() => getResourceName(myResource)).toThrowErrorMatchingInlineSnapshot(
      '"Multiple metadata entries specifying a resource name were found, expected 0 or 1."',
    );
  });
});
