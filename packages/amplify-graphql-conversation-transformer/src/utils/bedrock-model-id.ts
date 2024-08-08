export const getBedrockModelId = (modelName: string): string => {
  switch (modelName) {
    case 'Claude3Haiku':
      return 'anthropic.claude-3-haiku-20240307-v1:0';
    case 'Claude3Sonnet':
      return 'anthropic.claude-3-sonnet-20240229-v1:0';
    case 'Claude3Opus':
      return 'anthropic.claude-3-opus-20240229-v1:0';
    case 'Claude3.5Sonnet':
      return 'anthropic.claude-3-5-sonnet-20240620-v1:0';
    case 'MistralLarge':
      return 'mistral.mistral-large-2402-v1:0';
    case 'MistralSmall':
      return 'mistral.mistral-small-2402-v1:0';
    case 'Mistral8X7BInstruct':
      return 'mistral.mixtral-8x7b-instruct-v0:1';
    case 'Mistral7BInstruct':
      return 'mistral.mistral-7b-instruct-v0:2';
    case 'Llama38bInstruct':
      return 'meta.llama3-8b-instruct-v1:0';
    case 'Llama370bInstruct':
      return 'meta.llama3-70b-instruct-v1:0';
    default:
      return 'anthropic.claude-3-haiku-20240307-v1:0';
  }
};
