import path from 'path';
import { AmplifyCLI } from './utils/amplifyCLI';
import { executeAmplifyTestHarness } from './utils/testHarness';

const PROJECT_ROOT = path.join(__dirname, '..', '..');

executeAmplifyTestHarness('simple test', PROJECT_ROOT, async (cli: AmplifyCLI) => {
  const envName = 'devtest';
  const projName = 'simplemodel';
  const schemaText = `
  type Todo @model @auth(rules: [{ allow: public }]) {
    id: ID!
    content: String
  }`;

  await cli.initializeProject({ name: projName, envName });
  await cli.addApiWithoutSchema();
  await cli.updateSchema(projName, schemaText);
  await cli.push();
  await cli.codegen();
});
