import { bedrockInvokeModelResources } from '../utils/bedrock-model-resources';

const PARTITION = 'aws';
const REGION = 'us-west-2';
const ACCOUNT = '123456789012';

describe('bedrockInvokeModelResources', () => {
  test('plain foundation model grants only the regional foundation-model ARN', () => {
    const modelId = 'anthropic.claude-3-haiku-20240307-v1:0';
    expect(bedrockInvokeModelResources(PARTITION, REGION, ACCOUNT, modelId)).toEqual([
      `arn:aws:bedrock:${REGION}::foundation-model/${modelId}`,
    ]);
  });

  test('global. inference profile grants profile + regional model + partition-wide model', () => {
    const modelId = 'global.anthropic.claude-haiku-4-5-20251001-v1:0';
    const underlying = 'anthropic.claude-haiku-4-5-20251001-v1:0';
    expect(bedrockInvokeModelResources(PARTITION, REGION, ACCOUNT, modelId)).toEqual([
      `arn:aws:bedrock:${REGION}:${ACCOUNT}:inference-profile/${modelId}`,
      `arn:aws:bedrock:${REGION}::foundation-model/${underlying}`,
      `arn:aws:bedrock:::foundation-model/${underlying}`,
    ]);
  });

  test('us. inference profile grants profile + regional model (no partition-wide model)', () => {
    const modelId = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
    const underlying = 'anthropic.claude-haiku-4-5-20251001-v1:0';
    expect(bedrockInvokeModelResources(PARTITION, REGION, ACCOUNT, modelId)).toEqual([
      `arn:aws:bedrock:${REGION}:${ACCOUNT}:inference-profile/${modelId}`,
      `arn:aws:bedrock:${REGION}::foundation-model/${underlying}`,
    ]);
  });

  test.each(['eu.', 'apac.', 'ap.'])('%s inference profile grants profile + regional model', (prefix) => {
    const underlying = 'anthropic.claude-sonnet-4-5-20250929-v1:0';
    const modelId = `${prefix}${underlying}`;
    expect(bedrockInvokeModelResources(PARTITION, REGION, ACCOUNT, modelId)).toEqual([
      `arn:aws:bedrock:${REGION}:${ACCOUNT}:inference-profile/${modelId}`,
      `arn:aws:bedrock:${REGION}::foundation-model/${underlying}`,
    ]);
  });

  test('respects a non-default partition', () => {
    const modelId = 'global.anthropic.claude-haiku-4-5-20251001-v1:0';
    const resources = bedrockInvokeModelResources('aws-us-gov', REGION, ACCOUNT, modelId);
    expect(resources.every((arn) => arn.startsWith('arn:aws-us-gov:bedrock:'))).toBe(true);
  });
});
