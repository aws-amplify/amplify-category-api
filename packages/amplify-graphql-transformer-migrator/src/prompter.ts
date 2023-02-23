export type IPrompter = {
  confirmContinue: (message?: string) => Promise<boolean>;
};
