import { GRAPHQL_AUTH_MODE } from '@aws-amplify/api';
import { createContext } from 'react';

export type AuthMode = keyof typeof GRAPHQL_AUTH_MODE;

export type HarnessContextType = {
  authMode?: AuthMode;
};

// Context lets us pass a value deep into the component tree
// without explicitly threading it through every component.
// Create a context for the current theme (with "light" as the default).
export const HarnessContext = createContext<HarnessContextType>({});
