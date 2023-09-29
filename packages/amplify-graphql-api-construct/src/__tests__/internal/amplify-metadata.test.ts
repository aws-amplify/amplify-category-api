import * as os from 'os';
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { addAmplifyMetadataToStackDescription } from '../../internal/amplify-metadata';

jest.mock('os', () => ({
  ...jest.requireActual('os'),
  platform: jest.fn(),
}));

const platformOsMap: [string, string][] = [
  ['Mac', 'darwin'],
  ['Windows', 'win32'],
  ['Linux', 'linux'],
  ['Other', 'unknown'],
];

describe('addAmplifyMetadataToStackDescription', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test.each(platformOsMap)(
    'sets metadata in description for %s platform with no description set',
    (platformName: string, osName: string) => {
      // Initialize Mocks
      (os.platform as any).mockReturnValue(osName);

      // Set up Stack
      const stack = new Stack(undefined, 'TestStack');
      const construct = new Construct(stack, 'TestConstruct');

      // Attach Metadata
      addAmplifyMetadataToStackDescription(construct);

      // Retrieve Description from Synthesized Stack
      const template = Template.fromStack(stack);
      const description = (template as any).template.Description;

      // Validate Description contents
      expect(description).toBeDefined();
      const metadataPayload = JSON.parse(description);
      expect(Object.keys(metadataPayload).length).toEqual(4);
      expect(metadataPayload.createdOn).toEqual(platformName);
      expect(metadataPayload.createdBy).toEqual('AmplifyCDK');
      expect(metadataPayload.createdWith).toMatch(/^[0-9]*\.[0-9]*\.[0-9]*/);
      expect(metadataPayload.stackType).toEqual('api-AppSync');
    },
  );

  test.each(platformOsMap)(
    'does not set metadata in description for %s platform with existing description',
    (_: string, osName: string) => {
      // Initialize Mocks
      (os.platform as any).mockReturnValue(osName);

      // Set up Stack
      const stack = new Stack(undefined, 'TestStack', { description: 'I have a description' });
      const construct = new Construct(stack, 'TestConstruct');

      // Attach Metadata
      addAmplifyMetadataToStackDescription(construct);

      // Retrieve Description from Synthesized Stack
      const template = Template.fromStack(stack);
      const description = (template as any).template.Description;

      // Validate Description contents
      expect(description).toBeDefined();
      expect(() => JSON.parse(description)).toThrowError();
    },
  );
});
