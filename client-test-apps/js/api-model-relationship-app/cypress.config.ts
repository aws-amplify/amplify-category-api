import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  pageLoadTimeout: 3 * 60 * 1000, // 3 minutes
  responseTimeout: 3 * 60 * 1000, // 3 minutes
});
