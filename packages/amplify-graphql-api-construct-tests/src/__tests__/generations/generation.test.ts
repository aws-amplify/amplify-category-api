/* eslint-disable import/namespace */
import * as path from 'path';
import * as fs from 'fs-extra';
import { DURATION_20_MINUTES } from '../../utils/duration-constants';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { cdkDeploy, cdkDestroy, initCDKProject } from '../../commands';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { doAppSyncGraphqlQuery, TestDefinition, writeStackConfig, writeTestDefinitions } from '../../utils';
import { generateRecipe, makeTodo, solveEquation, summarize } from './graphql/queries';

jest.setTimeout(DURATION_20_MINUTES);

describe('generation', () => {
  const baseProjFolderName = path.basename(__filename, '.test.ts');

  describe('Generation Model', () => {
    const projFolderName = `${baseProjFolderName}-model`;
    let apiEndpoint: string;
    let apiKey: string;
    let projRoot: string;

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'configurable-stack'));
      const name = await initCDKProject(projRoot, templatePath);

      const generationSchemaPath = path.resolve(path.join(__dirname, 'graphql', 'schema-generation.graphql'));
      const generationSchema = fs.readFileSync(generationSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        generation: {
          schema: [generationSchema].join('\n'),
          strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        },
      };

      writeStackConfig(projRoot, { prefix: 'Gen', useSandbox: true });
      writeTestDefinitions(testDefinitions, projRoot);

      const outputs = await cdkDeploy(projRoot, '--all');
      apiEndpoint = outputs[name].awsAppsyncApiEndpoint;
      apiKey = outputs[name].awsAppsyncApiKey;
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }
      deleteProjectDir(projRoot);
    });

    describe('Generation model', () => {
      // TODO: This currently doesn't work because of implicitly generated required values like id, createdAt, updatedAt.
      // This should be fine if we generate the tool definitions in `generateResolvers` instead of `fields` in the generation-transformer.
      xtest('should generate a model', async () => {
        const args = {
          apiEndpoint,
          auth: { apiKey },
        };
        const variables = {
          description:
            'I have to pick up the kids from school. One goes to soccer practice at 3:30pm and the other to swim practice at 4:30pm.',
        };
        const makeTodoResult = await doAppSyncGraphqlQuery({ ...args, query: makeTodo, variables });
        console.log('makeTodoResult', JSON.stringify(makeTodoResult, null, 2));
        const todo = makeTodoResult.body.data.makeTodo;
        console.log('todo', todo);
        expect(todo.content).toBeDefined();
      });
    });

    describe('Generation type', () => {
      test('should generate a type', async () => {
        const args = {
          apiEndpoint,
          auth: { apiKey },
        };

        const variables = {
          description: `I'd like to make a gluten-free chocolate cake.`,
        };

        const generateRecipeResult = await doAppSyncGraphqlQuery({ ...args, query: generateRecipe, variables });
        const recipe = generateRecipeResult.body.data.generateRecipe;
        expect(recipe.name).toBeDefined();
      });
    });

    describe('Generation scalar', () => {
      test('should generate a string scalar type', async () => {
        const args = {
          apiEndpoint,
          auth: { apiKey },
        };

        const variables = {
          input: `
                Two roads diverged in a yellow wood,
                And sorry I could not travel both
                And be one traveler, long I stood
                And looked down one as far as I could
                To where it bent in the undergrowth;

                Then took the other, as just as fair,
                And having perhaps the better claim,
                Because it was grassy and wanted wear;
                Though as for that the passing there
                Had worn them really about the same,

                And both that morning equally lay
                In leaves no step had trodden black.
                Oh, I kept the first for another day!
                Yet knowing how way leads on to way,
                I doubted if I should ever come back.

                I shall be telling this with a sigh
                Somewhere ages and ages hence:
                Two roads diverged in a wood, and I—
                I took the one less traveled by,
                And that has made all the difference.`,
        };
        const summarizeResult = await doAppSyncGraphqlQuery({ ...args, query: summarize, variables });
        const summary = summarizeResult.body.data.summarize;
        expect(summary).toBeDefined();
      });
    });

    test('should generate an int scalar type', async () => {
      const args = {
        apiEndpoint,
        auth: { apiKey },
      };

      const variables = {
        equation: `
          There is a three-digit number. The second digit is four times as big as the third digit,
          while the first digit is three less than the second digit. What is the number?
        `,
      };
      const solveEquationResult = await doAppSyncGraphqlQuery({ ...args, query: solveEquation, variables });
      const solution = solveEquationResult.body.data.solveEquation;
      console.log('solution', solution);
      expect(solution).toBeDefined();
    });
  });
});
