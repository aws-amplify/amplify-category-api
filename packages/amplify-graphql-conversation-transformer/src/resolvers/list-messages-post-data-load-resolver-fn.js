export function request(ctx) {
  return {};
}

export function response(ctx) {
  const items = ctx.prev.result.items.reduce((acc, item) => {
      const userMessage = {
          ...item,
          role: "user",
          updatedAt: item.createdAt
      };
      delete userMessage.assistantContent;
      acc.push(userMessage);

      if (item.assistantContent) {
          const assistantMessage = {
              ...item,
              role: "assistant",
              content: item.assistantContent,
              createdAt: item.updatedAt,
          };
          delete assistantMessage.assistantContent;
          acc.push(assistantMessage);
      }

      return acc;
  }, []);

  return { ...ctx.prev.result, items };
}