import { $TSContext } from 'amplify-cli-core';
import chalk from 'chalk';
import * as prompts from 'amplify-prompts';
import { InvalidBracketsError } from '@aws-amplify/graphql-transformer-core';
import { showSandboxModePrompts, showGlobalSandboxModeWarning, schemaHasSandboxModeEnabled } from '../../graphql-transformer/sandbox-mode-helpers';
import * as apiKeyHelpers from '../../graphql-transformer/api-key-helpers';

let ctx;
let apiKeyPresent = true;

describe('sandbox mode helpers', () => {
  beforeEach(() => {
    const envName = 'dev';
    const getEnvInfo = (): {envName: string} => ({ envName });
    ctx = {
      amplify: {
        getEnvInfo,
        invokePluginMethod: jest.fn(),
      },
    } as unknown as $TSContext;

    jest.spyOn(prompts.printer, 'info').mockImplementation();
    jest.spyOn(apiKeyHelpers, 'hasApiKey').mockResolvedValue(apiKeyPresent);
  });

  describe('showSandboxModePrompts', () => {
    describe('missing api key', () => {
      beforeAll(() => {
        apiKeyPresent = false;
      });

      it('displays warning', async () => {
        await showSandboxModePrompts(ctx);

        expect(prompts.printer.info).toBeCalledWith(
          `
⚠️  WARNING: Global Sandbox Mode has been enabled, which requires a valid API key. If
you'd like to disable, remove ${chalk.green('"input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }"')}
from your GraphQL schema and run 'amplify push' again. If you'd like to proceed with
sandbox mode disabled, do not create an API Key.
`,
          'yellow',
        );
        expect(ctx.amplify.invokePluginMethod).toBeCalledWith(ctx, 'api', undefined, 'promptToAddApiKey', [ctx]);
      });
    });
  });

  describe('showGlobalSandboxModeWarning', () => {
    it('prints sandbox api key message', () => {
      showGlobalSandboxModeWarning('mockLink');

      expect(prompts.printer.info).toBeCalledWith(
        `
⚠️  WARNING: your GraphQL API currently allows public create, read, update, and delete access to all models via an API Key. To configure PRODUCTION-READY authorization rules, review: mockLink
`,
        'yellow',
      );
    });
  });

  describe('schemaHasSandboxModeEnabled', () => {
    it('parses sandbox AMPLIFY input on schema', () => {
      const schema = `
        input AMPLIFY { globalAuthRule: AuthRule = { allow: public } }
      `;

      expect(schemaHasSandboxModeEnabled(schema, 'mockDocLink')).toEqual(true);
    });

    it('passes through when AMPLIFY input is not present', () => {
      const schema = `
        type Todo @model {
          id: ID!
          content: String
        }
      `;

      expect(schemaHasSandboxModeEnabled(schema, 'mockDocLink')).toEqual(false);
    });

    describe('input AMPLIFY has incorrect values', () => {
      it('checks for "globalAuthRule"', () => {
        const schema = `
          input AMPLIFY { auth_rule: AuthenticationRule = { allow: public } }
        `;

        expect(() => schemaHasSandboxModeEnabled(schema, 'mockLink')).toThrow(
          Error('input AMPLIFY requires "globalAuthRule" field. Learn more here: mockLink'),
        );
      });

      it('allows "global_auth_rule"', () => {
        const schema = `
          input AMPLIFY { global_auth_rule: AuthRule = { allow: public } }
        `;

        expect(schemaHasSandboxModeEnabled(schema, 'mockDocLink')).toEqual(true);
      });

      it('guards for AuthRule', () => {
        const schema = `
          input AMPLIFY { globalAuthRule: AuthenticationRule = { allow: public } }
        `;

        expect(() => schemaHasSandboxModeEnabled(schema, 'mockLink')).toThrow(
          Error(
            'There was a problem with your auth configuration. Learn more about auth here: mockLink',
          ),
        );
      });

      it('checks for "allow" field name', () => {
        const schema = `
          input AMPLIFY { globalAuthRule: AuthRule = { allows: public } }
        `;

        expect(() => schemaHasSandboxModeEnabled(schema, 'mockLink')).toThrow(
          Error(
            'There was a problem with your auth configuration. Learn more about auth here: mockLink',
          ),
        );
      });

      it('checks for "public" value from "allow" field', () => {
        const schema = `
          input AMPLIFY { globalAuthRule: AuthRule = { allow: private } }
        `;

        expect(() => schemaHasSandboxModeEnabled(schema, 'mockLink')).toThrowError(
          Error(
            'There was a problem with your auth configuration. Learn more about auth here: mockLink',
          ),
        );
      });

      it('checks for missing bracket in schema', () => {
        const schema = `
        """
        ""this is a comment :)""
        Bracket mismatch in this comment (({}))}}}
        """
        # This is also a comment :)
        # This "input" configures a global authorization rule to enable public access to
        # all models in this schema. Learn more about authorization rules here: https://docs.amplify.aws/cli/graphql/authorization-rules
        input AMPLIFY {
          globalAuthRule: AuthRule = { allow: public }
        } # FOR TESTING ONLY!
        type Todo @model @auth(rules: [{allow: owner groups: ["Admins#(accounts):)"] operations: [create, update, delete]} 
                                       {allow: public, operations: [read] }] {
          id: ID!
          name: String!
          description: String
        }
        `;

        expect(() => schemaHasSandboxModeEnabled(schema, 'mockLink')).toThrowError(
          new InvalidBracketsError(
            'Syntax Error: mismatched brackets found in the schema. Missing ) for opening bracket at line 12 in the schema.',
          ),
        );
      });

      it('checks for extra bracket in schema', () => {
        const schema = `
        """
        ""this is a comment :)""
        Bracket mismatch in this comment (({}))}}}
        """
        # This is also a comment :)
        # This "input" configures a global authorization rule to enable public access to
        # all models in this schema. Learn more about authorization rules here: https://docs.amplify.aws/cli/graphql/authorization-rules
        input AMPLIFY {
          globalAuthRule: AuthRule = { allow: public }
        } # FOR TESTING ONLY!
        type Todo @model @auth(rules: [{allow: owner groups: ["Admins#(accounts):)"] operations: [create, update, delete]} 
                                       {allow: public, operations: [read] }])) {
          id: ID!
          name: String!
          description: String
        }
        `;

        expect(() => schemaHasSandboxModeEnabled(schema, 'mockLink')).toThrowError(
          new InvalidBracketsError(
            'Syntax Error: mismatched brackets found in the schema. Unexpected ) at line 13 in the schema.',
          ),
        );
      });

      it('verifies there are no mismatched brackets in schema', () => {
        const schema = `
        """
        ""this is a comment :)""
        Bracket mismatch in this comment (({}))}}}
        "And this one 
        And this"
        ""Also this
        Also this""
        # This 2 hashes #
        #
        ""
        "
        """
        # This is also a comment :)
        # This "input" configures a global authorization rule to enable public access to
        # all models in this schema. Learn more about authorization rules here: https://docs.amplify.aws/cli/graphql/authorization-rules
        input AMPLIFY {
          globalAuthRule: AuthRule = { allow: public }
        } # FOR TESTING ONLY!
        type Todo @model @auth(rules: [{allow: owner groups: ["Admins#(accounts):)"] operations: [create, update, delete]} 
                                       {allow: public, operations: [read] }]) {
          id: ID!
          name: String!
          description: String
          # ["asdf"]
        }
        `;

        expect(schemaHasSandboxModeEnabled(schema, 'mockDocLink')).toEqual(true);
      });
    });
  });
});
