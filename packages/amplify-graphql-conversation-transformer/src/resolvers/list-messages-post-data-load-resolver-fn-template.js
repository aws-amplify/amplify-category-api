/**
 * Starts the resolver execution
 * @param {import('@aws-appsync/utils').Context} ctx the context
 * @returns {*} the return value sent to the first AppSync function
 */
export function request(ctx) {
  return {};
}

/**
* Returns the resolver result
* @param {import('@aws-appsync/utils').Context} ctx the context
* @returns {*} the return value of the last AppSync function response handler
*/
export function response(ctx) {
  const { result } = ctx.prev;
  const items = squashAssistantMessages(result.items);
  return { ...result, items };
}

function squashAssistantMessages(items) {
  const userMessages = [];
  const assistantMessages = {};

  for (const item of items) {
    if (item.role === "assistant" && item.associatedUserMessageId) {
      if (!assistantMessages[item.associatedUserMessageId]) {
        assistantMessages[item.associatedUserMessageId] = {
          ...item,
          content: [{ text: item.content[0].text }],
        };
      } else {
        const existingMessage = assistantMessages[item.associatedUserMessageId];
        existingMessage.content[0].text += item.content[0].text;
      }
    } else {
      userMessages.push(item);
    }
  }

  // Add any remaining squashed assistant messages to the result
  let messages = [];
  for (const item of userMessages) {
    messages.push(item);
    const pairedAssistantMessage = assistantMessages[item.id];
    if (pairedAssistantMessage) {
      messages.push(pairedAssistantMessage);
    }
  }

  return messages;
}